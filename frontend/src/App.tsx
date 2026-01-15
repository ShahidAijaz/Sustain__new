import { useEffect, useState } from "react";
import Editor from "./components/Editor";
import SimulationResults from "./components/SimulationResults";
import AIReport from "./components/AIReport";

import {
  HeatingMode,
  RoomConfig,
  SimulationConfig,
  SimulationResult,
} from "./types";

import { runSimulation } from "./services/simulationEngine";
import { getMe } from "./services/auth";

/* ---------------- DEFAULT ROOM ---------------- */
const defaultRoom: RoomConfig = {
  width: 5,
  depth: 4,
  height: 2.8,

  wallUValue: 0.35,
  roofUValue: 0.25,
  floorUValue: 0.3,
  infiltrationRate: 0.6,

  wallSpecificUValues: undefined,
  openings: [],
};

/* ---------------- DEFAULT SIM CONFIG ---------------- */
const defaultConfig: SimulationConfig = {
  durationHours: 24,
  timeStepMinutes: 15,

  initialTemp: 18,
  targetTemp: 21,

  outdoorTempDay: 12,
  outdoorTempNight: 4,

  heatingMode: HeatingMode.Thermostat,
  heaterPower: 6,
};

export default function App() {
  const [room, setRoom] = useState<RoomConfig>(defaultRoom);
  const [config] = useState<SimulationConfig>(defaultConfig);
  const [results, setResults] = useState<SimulationResult | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /* 🔐 AUTH CHECK (BACKEND VERIFIED) */
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("token");

      if (!token) {
        window.location.replace("/login");
        return;
      }

      try {
        await getMe(); // backend + DB verification
        setIsAuthenticated(true);
      } catch {
        localStorage.clear();
        window.location.replace("/login");
      } finally {
        setAuthChecked(true);
      }
    }

    checkAuth();
  }, []);

  /* ⏳ BLOCK UI UNTIL AUTH CHECK */
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Verifying session…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  /* ▶️ RUN SIMULATION */
  const handleRunSimulation = () => {
    const res = runSimulation(room, config);
    setResults(res);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* TOP BAR */}
      <div className="p-4 border-b bg-white flex justify-between items-center">
        <h1 className="text-lg font-bold">
          SustainX – Thermal Simulation
        </h1>

        <button
          onClick={handleRunSimulation}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          Run Simulation
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* EDITOR */}
        <div className="lg:col-span-2 overflow-hidden">
          <Editor room={room} onUpdate={setRoom} />
        </div>

        {/* RESULTS */}
        <div className="flex flex-col gap-4 overflow-auto">
          {!results && (
            <div className="p-6 bg-white rounded-xl border border-slate-200 text-slate-500">
              Click <b>Run Simulation</b> to generate results
            </div>
          )}

          {results && <SimulationResults results={results} />}

          {results && (
            <AIReport
              room={room}
              config={config}
              results={results}
            />
          )}
        </div>
      </div>
    </div>
  );
}
