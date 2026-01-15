
export enum WallOrientation {
  North = 'North',
  South = 'South',
  East = 'East',
  West = 'West',
}

export enum OpeningType {
  Window = 'Window',
  Door = 'Door',
}

export interface Opening {
  id: string;
  type: OpeningType;
  width: number; // meters
  height: number; // meters
  offset: number; // meters from the start of the wall (Left for N/S, Top for E/W)
  uValue: number; // W/m²K
  shgc?: number; // Solar Heat Gain Coefficient (0-1)
  wall: WallOrientation;
}

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
  wallUValue: number; // Deprecated as primary source, used as fallback or global setter
  wallSpecificUValues?: { [key in WallOrientation]: number }; // New: Per-wall U-values
  roofUValue: number;
  floorUValue: number;
  infiltrationRate: number; // Air Changes Per Hour (ACH)
  openings: Opening[];
}

export enum HeatingMode {
  Thermostat = 'Thermostat',
  FixedPower = 'FixedPower',
  Schedule = 'Schedule' // Added placeholder for future
}

export interface SimulationConfig {
  durationHours: number;
  timeStepMinutes: number;
  initialTemp: number;
  targetTemp: number;
  heaterPower: number; // kW
  heatingMode: HeatingMode;
  outdoorTempDay: number;
  outdoorTempNight: number;
}

export interface SimulationStep {
  time: number;
  indoorTemp: number;
  outdoorTemp: number;
  heatingPower: number;
  heatLossConduction: number;
  heatLossVentilation: number;
  heatGainSolar: number; // New parameter
  totalEnergy: number;
}

export interface SimulationResult {
  id: string; // Unique ID for history
  timestamp: number; // Date run
  data: SimulationStep[];
  totalEnergyConsumption: number;
  maxHeatLoss: number;
  averageTemp: number;
  config: SimulationConfig; // Store config for history
  room: RoomConfig; // Store room for history
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  roomName: string;
  totalEnergy: number;
  avgTemp: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
