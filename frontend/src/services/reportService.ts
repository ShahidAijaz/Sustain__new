import { RoomConfig, SimulationResult, SimulationConfig } from "../types";

export const generateStaticReport = (
  room: RoomConfig,
  config: SimulationConfig,
  results: SimulationResult
): string => {
  const area = room.width * room.depth;
  const energyPerSqm = results.totalEnergyConsumption / area;
  
  // Logic for recommendations
  const recommendations: string[] = [];
  
  if (room.wallUValue > 0.5) {
    recommendations.push(`**Improve Wall Insulation**: Your wall U-value (${room.wallUValue}) is high. Consider adding external or cavity insulation to reach at least 0.3 W/m²K.`);
  }
  
  if (room.infiltrationRate > 1.0) {
    recommendations.push(`**Draft Proofing**: The air leakage rate is high (${room.infiltrationRate} ACH). Sealing gaps around windows and doors is a cost-effective win.`);
  }

  const hasSingleGlazing = room.openings.some(o => o.type === 'Window' && o.uValue > 3.0);
  if (hasSingleGlazing) {
    recommendations.push(`**Upgrade Windows**: Single glazing detected. Upgrading to double or triple glazing will significantly reduce heat loss.`);
  }

  if (config.targetTemp > 21) {
    recommendations.push(`**Lower Thermostat**: Your target temperature is ${config.targetTemp}°C. Lowering it by just 1°C can save ~10% on heating bills.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Your building envelope is performing very well! Consider renewable generation like Solar PV.");
  }

  // Scoring
  let score = 10;
  if (energyPerSqm > 5) score -= 2;
  if (energyPerSqm > 10) score -= 2;
  if (energyPerSqm > 20) score -= 3;
  if (room.wallUValue > 1.0) score -= 1;
  score = Math.max(0, score);

  return `
# Simulation Report

**Date:** ${new Date(results.timestamp).toLocaleDateString()}
**Room Area:** ${area.toFixed(1)} m²

## 1. Performance Summary
*   **Total Energy:** ${results.totalEnergyConsumption} kWh
*   **Energy Intensity:** ${energyPerSqm.toFixed(2)} kWh/m² (24h)
*   **Average Temperature:** ${results.averageTemp}°C
*   **Peak Heating Load:** ${results.maxHeatLoss} kW

## 2. Efficiency Score: ${score}/10
${score > 7 ? "🟢 Excellent Efficiency" : score > 4 ? "🟡 Moderate Efficiency" : "🔴 Poor Efficiency"}

## 3. Key Observations
*   **Heat Loss:** The simulation shows a peak heat loss of ${results.maxHeatLoss} kW.
*   **Solar Gain:** Windows provided passive heating, reducing load during peak daylight hours.
*   **Airtightness:** Running at ${room.infiltrationRate} Air Changes Per Hour.

## 4. Recommendations
${recommendations.map(r => `* ${r}`).join('\n')}
  `;
};