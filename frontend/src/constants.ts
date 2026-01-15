
import { RoomConfig, SimulationConfig, HeatingMode, WallOrientation, OpeningType } from './types';

export const DEFAULT_ROOM: RoomConfig = {
  width: 6,
  depth: 5,
  height: 2.7,
  wallUValue: 0.3, // Insulated Wall
  wallSpecificUValues: {
    [WallOrientation.North]: 0.3,
    [WallOrientation.South]: 0.3,
    [WallOrientation.East]: 0.3,
    [WallOrientation.West]: 0.3,
  },
  roofUValue: 0.25,
  floorUValue: 0.4,
  infiltrationRate: 0.5, // 0.5 ACH (Modern standard)
  openings: [
    {
      id: '1',
      type: OpeningType.Window,
      width: 1.5,
      height: 1.2,
      offset: 1.5, // 1.5m from left
      uValue: 1.6, // Double Glazed
      shgc: 0.6,
      wall: WallOrientation.South,
    },
    {
      id: '2',
      type: OpeningType.Door,
      width: 0.9,
      height: 2.1,
      offset: 0.5, // 0.5m from left
      uValue: 1.8,
      wall: WallOrientation.North,
    },
  ],
};

export const DEFAULT_SIMULATION: SimulationConfig = {
  durationHours: 24,
  timeStepMinutes: 15,
  initialTemp: 18,
  targetTemp: 21,
  heaterPower: 3.0, // 3kW heater
  heatingMode: HeatingMode.Thermostat,
  outdoorTempDay: 12,
  outdoorTempNight: 2,
};

export const MATERIAL_PRESETS = {
  walls: [
    { name: 'Solid Stone (Uninsulated)', uValue: 2.30 },
    { name: 'Solid Brick (Old)', uValue: 2.10 },
    { name: 'Cavity Wall (Uninsulated)', uValue: 1.50 },
    { name: 'Cavity Wall (Retrofit)', uValue: 0.60 },
    { name: 'Timber Frame (Standard)', uValue: 0.45 },
    { name: 'Modern Brick (Insulated)', uValue: 0.28 },
    { name: 'SIPS / ICF (High Perf.)', uValue: 0.15 },
    { name: 'Passive House Ultra', uValue: 0.10 },
  ],
  windows: [
    { name: 'Single Glazed', uValue: 5.0, shgc: 0.8 },
    { name: 'Double Glazed (Standard)', uValue: 2.8, shgc: 0.7 },
    { name: 'Double Glazed (Low-E)', uValue: 1.6, shgc: 0.6 },
    { name: 'Triple Glazed', uValue: 0.8, shgc: 0.5 },
  ],
  infiltration: [
    { name: 'Very Leaky (Old/Drafty)', value: 1.5 },
    { name: 'Average (Standard)', value: 0.7 },
    { name: 'Good (New Build)', value: 0.4 },
    { name: 'Airtight (Sealed)', value: 0.2 },
    { name: 'Passive House', value: 0.06 },
  ]
};
