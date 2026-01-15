
import { RoomConfig, SimulationConfig, SimulationResult, SimulationStep, WallOrientation } from '../types';

/**
 * Calculates simplified solar irradiance on vertical surfaces based on time of day.
 * Approximates sun path for a typical equinox day.
 */
const getSolarIrradiance = (hour: number, orientation: WallOrientation): number => {
  // Simple solar model (W/m2)
  const sunRise = 6;
  const sunSet = 18;
  const peakIrradiance = 800; // W/m2 direct sun

  if (hour < sunRise || hour > sunSet) return 0;

  // Relative sun angle (0 = South at noon)
  const hourAngle = (hour - 12) * (Math.PI / 12); // radians

  let surfaceNormal = 0;
  switch (orientation) {
    case WallOrientation.South: surfaceNormal = 0; break;
    case WallOrientation.East: surfaceNormal = -Math.PI / 2; break;
    case WallOrientation.West: surfaceNormal = Math.PI / 2; break;
    case WallOrientation.North: return 50; // Diffuse only
  }

  // Angle of incidence factor
  const incidence = Math.cos(hourAngle - surfaceNormal);
  
  if (incidence <= 0) return 50; // Diffuse light only
  return 50 + (peakIrradiance * incidence);
};

const calculateAreas = (room: RoomConfig) => {
  const roofArea = room.width * room.depth;
  const floorArea = room.width * room.depth;
  
  // Calculate Gross Areas
  const grossAreas = {
    [WallOrientation.North]: room.width * room.height,
    [WallOrientation.South]: room.width * room.height,
    [WallOrientation.East]: room.depth * room.height,
    [WallOrientation.West]: room.depth * room.height,
  };

  // Calculate Openings Area & UA per wall
  const openingAreas = {
    [WallOrientation.North]: 0,
    [WallOrientation.South]: 0,
    [WallOrientation.East]: 0,
    [WallOrientation.West]: 0,
  };

  let weightedOpeningUA = 0; 
  
  room.openings.forEach(op => {
    const area = op.width * op.height;
    openingAreas[op.wall] += area;
    weightedOpeningUA += area * op.uValue;
  });

  // Calculate Net Wall Areas (Gross - Openings)
  const netWallAreas = {
    [WallOrientation.North]: Math.max(0, grossAreas[WallOrientation.North] - openingAreas[WallOrientation.North]),
    [WallOrientation.South]: Math.max(0, grossAreas[WallOrientation.South] - openingAreas[WallOrientation.South]),
    [WallOrientation.East]: Math.max(0, grossAreas[WallOrientation.East] - openingAreas[WallOrientation.East]),
    [WallOrientation.West]: Math.max(0, grossAreas[WallOrientation.West] - openingAreas[WallOrientation.West]),
  };

  return {
    netWallAreas,
    roofArea,
    floorArea,
    weightedOpeningUA,
  };
};

export const runSimulation = (
  room: RoomConfig,
  simConfig: SimulationConfig
): SimulationResult => {
  const { netWallAreas, roofArea, floorArea, weightedOpeningUA } = calculateAreas(room);

  // Thermal properties
  const airDensity = 1.225; 
  const cpAir = 1005; 
  const roomVolume = room.width * room.depth * room.height;
  const thermalMass = roomVolume * airDensity * cpAir * 5; // *5 Factor to account for furniture/drywall thermal mass

  let currentTemp = simConfig.initialTemp;
  let totalEnergyKWh = 0;
  const data: SimulationStep[] = [];
  const steps = (simConfig.durationHours * 60) / simConfig.timeStepMinutes;
  const dtSeconds = simConfig.timeStepMinutes * 60;

  // Use specific wall U-values or fallback to global
  const getWallU = (o: WallOrientation) => room.wallSpecificUValues ? room.wallSpecificUValues[o] : room.wallUValue;

  // Calculate Wall UA Sum (Conductance)
  const wallUA = 
    (netWallAreas[WallOrientation.North] * getWallU(WallOrientation.North)) +
    (netWallAreas[WallOrientation.South] * getWallU(WallOrientation.South)) +
    (netWallAreas[WallOrientation.East] * getWallU(WallOrientation.East)) +
    (netWallAreas[WallOrientation.West] * getWallU(WallOrientation.West));

  for (let i = 0; i <= steps; i++) {
    const timeHours = (i * simConfig.timeStepMinutes) / 60;
    
    // Outdoor Temp (Sinusoidal)
    const cyclePos = (timeHours - 14) / 24 * 2 * Math.PI; 
    const tempAmp = (simConfig.outdoorTempDay - simConfig.outdoorTempNight) / 2;
    const tempAvg = (simConfig.outdoorTempDay + simConfig.outdoorTempNight) / 2;
    const outdoorTemp = tempAvg + tempAmp * Math.cos(cyclePos);

    const deltaT = currentTemp - outdoorTemp;

    // 1. Conduction Loss (Watts)
    const wallLoss = wallUA * deltaT;
    const roofLoss = roofArea * room.roofUValue * deltaT;
    const floorLoss = floorArea * room.floorUValue * (currentTemp - (tempAvg - 4)); // Ground is more stable
    const openingConduction = weightedOpeningUA * deltaT;
    
    // 2. Ventilation/Infiltration Loss (Watts)
    // Q = 0.33 * n * V * dT
    const ventilationLoss = (0.33 * room.infiltrationRate * roomVolume * deltaT);

    const totalHeatLossWatts = wallLoss + roofLoss + floorLoss + openingConduction + ventilationLoss;
    
    // 3. Solar Gain (Watts)
    let solarGainWatts = 0;
    room.openings.forEach(op => {
      if (op.type === 'Window') {
        const irradiance = getSolarIrradiance(timeHours % 24, op.wall);
        const area = op.width * op.height;
        solarGainWatts += area * (op.shgc || 0.7) * irradiance;
      }
    });

    // Heating Logic
    let heaterOutputWatts = 0;
    const maxHeaterWatts = simConfig.heaterPower * 1000;

    if (simConfig.heatingMode === 'Thermostat') {
      if (currentTemp < simConfig.targetTemp) {
        // Energy balance required to hit target
        const energyDeficit = (simConfig.targetTemp - currentTemp) * thermalMass / dtSeconds;
        const steadyStateMaintain = totalHeatLossWatts - solarGainWatts;
        const powerNeeded = energyDeficit + steadyStateMaintain;
        
        heaterOutputWatts = Math.min(maxHeaterWatts, Math.max(0, powerNeeded));
      }
    } else {
      heaterOutputWatts = maxHeaterWatts;
    }

    // New Temp
    const netPower = heaterOutputWatts + solarGainWatts - totalHeatLossWatts;
    currentTemp += (netPower * dtSeconds) / thermalMass;

    // Accumulate
    const stepKWh = (heaterOutputWatts * dtSeconds) / 3600000;
    totalEnergyKWh += stepKWh;

    data.push({
      time: parseFloat(timeHours.toFixed(1)),
      indoorTemp: parseFloat(currentTemp.toFixed(2)),
      outdoorTemp: parseFloat(outdoorTemp.toFixed(2)),
      heatingPower: parseFloat((heaterOutputWatts / 1000).toFixed(2)),
      heatLossConduction: parseFloat(((wallLoss + roofLoss + floorLoss + openingConduction) / 1000).toFixed(2)),
      heatLossVentilation: parseFloat((ventilationLoss / 1000).toFixed(2)),
      heatGainSolar: parseFloat((solarGainWatts / 1000).toFixed(2)),
      totalEnergy: parseFloat(totalEnergyKWh.toFixed(2)),
    });
  }

  const temps = data.map(d => d.indoorTemp);
  const maxLoss = Math.max(...data.map(d => d.heatLossConduction + d.heatLossVentilation));
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    data,
    totalEnergyConsumption: parseFloat(totalEnergyKWh.toFixed(2)),
    maxHeatLoss: parseFloat(maxLoss.toFixed(2)),
    averageTemp: parseFloat(avgTemp.toFixed(2)),
    room: { ...room }, // Snapshot
    config: { ...simConfig } // Snapshot
  };
};
