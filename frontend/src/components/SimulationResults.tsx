import React from 'react';
import { SimulationResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, ReferenceLine, Brush
} from 'recharts';
import { Thermometer, Zap, Wind, Sun, Activity } from 'lucide-react';

interface SimulationResultsProps {
  results: SimulationResult;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200 rounded-xl shadow-xl text-sm min-w-[200px]">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">
          Time: <span className="font-mono text-indigo-600">{label}h</span>
        </p>
        <div className="space-y-1.5">
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
                <span className="text-slate-500 capitalize">{p.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-700">
                {p.value} <span className="text-[10px] text-slate-400 font-normal">{p.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const SimulationResults: React.FC<SimulationResultsProps> = ({ results }) => {
  
  // Aggregate data for Pie Chart
  const totalConduction = results.data.reduce((acc, curr) => acc + curr.heatLossConduction, 0);
  const totalVentilation = results.data.reduce((acc, curr) => acc + curr.heatLossVentilation, 0);
  
  const pieData = [
    { name: 'Fabric (Conduction)', value: parseFloat(totalConduction.toFixed(2)), color: '#f59e0b' },
    { name: 'Ventilation (Air)', value: parseFloat(totalVentilation.toFixed(2)), color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="kpi-card group">
          <div className="icon-box bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Zap size={24} /></div>
          <div><p className="kpi-label">Total Energy</p><p className="kpi-val">{results.totalEnergyConsumption} <span className="text-sm font-normal text-slate-400">kWh</span></p></div>
        </div>
        <div className="kpi-card group">
          <div className="icon-box bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Thermometer size={24} /></div>
          <div><p className="kpi-label">Avg Temp</p><p className="kpi-val">{results.averageTemp} <span className="text-sm font-normal text-slate-400">°C</span></p></div>
        </div>
        <div className="kpi-card group">
          <div className="icon-box bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors"><Wind size={24} /></div>
          <div><p className="kpi-label">Peak Heat Loss</p><p className="kpi-val">{results.maxHeatLoss} <span className="text-sm font-normal text-slate-400">kW</span></p></div>
        </div>
         <div className="kpi-card group">
          <div className="icon-box bg-yellow-100 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-colors"><Sun size={24} /></div>
          <div><p className="kpi-label">Solar Gain Est.</p><p className="kpi-val">{(results.data.reduce((a,c)=>a+c.heatGainSolar, 0)/4).toFixed(1)} <span className="text-sm font-normal text-slate-400">kWh</span></p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Temp Chart */}
        <div className="lg:col-span-2 chart-card">
          <div className="flex justify-between items-center mb-6">
             <h3 className="chart-title flex items-center gap-2">
                <Activity size={18} className="text-emerald-500"/> 
                Temperature & Heating Profile
             </h3>
             <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Indoor</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Heater</div>
             </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={results.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{fontSize: 12, fill: '#64748b'}} unit="h" axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis yAxisId="left" domain={['auto', 'auto']} unit="°C" stroke="#10b981" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" unit="kW" orientation="right" stroke="#3b82f6" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Target Temp Reference */}
                <ReferenceLine y={results.config.targetTemp} yAxisId="left" stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'right', value: 'Target', fill: '#f43f5e', fontSize: 10 }} />

                <Line yAxisId="left" type="monotone" dataKey="indoorTemp" name="Indoor" unit="°C" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1500} />
                <Line yAxisId="left" type="monotone" dataKey="outdoorTemp" name="Outdoor" unit="°C" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} animationDuration={1500} />
                <Line yAxisId="right" type="step" dataKey="heatingPower" name="Heater" unit="kW" stroke="#3b82f6" strokeWidth={2} dot={false} fillOpacity={0.1} animationDuration={1500} />
                
                <Brush dataKey="time" height={30} stroke="#cbd5e1" fill="#f8fafc" tickFormatter={() => ''} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heat Loss Breakdown Pie */}
        <div className="chart-card flex flex-col">
           <h3 className="chart-title">Heat Loss Distribution</h3>
           <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                    stroke="none"
                  >
                   {pieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip content={<CustomTooltip />} />
                 <Legend verticalAlign="bottom" height={36} iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="text-center text-xs text-slate-400 mt-2 px-4">
              Breakdown of where thermal energy is leaving the building envelope.
           </div>
        </div>
      </div>

      {/* Stacked Area Chart */}
      <div className="chart-card">
         <h3 className="chart-title mb-6">Cumulative Energy Flows</h3>
         <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={results.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFabric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{fontSize: 12, fill:'#64748b'}} unit="h" axisLine={false} tickLine={false} />
              <YAxis unit="kW" tick={{fontSize: 12, fill:'#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="rect" />
              <Area type="monotone" dataKey="heatLossConduction" name="Fabric Loss" unit="kW" stackId="1" stroke="#f59e0b" fill="url(#colorFabric)" animationDuration={1000} />
              <Area type="monotone" dataKey="heatLossVentilation" name="Ventilation Loss" unit="kW" stackId="1" stroke="#ef4444" fill="url(#colorVent)" animationDuration={1000} />
              <Area type="monotone" dataKey="heatGainSolar" name="Solar Gain" unit="kW" stackId="2" stroke="#eab308" fill="url(#colorSolar)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
         </div>
      </div>

      <style>{`
        .kpi-card { @apply bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default; }
        .icon-box { @apply p-3 rounded-full flex-shrink-0 transition-colors duration-300; }
        .kpi-label { @apply text-xs uppercase tracking-wider text-slate-500 font-bold mb-1; }
        .kpi-val { @apply text-2xl font-black text-slate-800 tracking-tight; }
        .chart-card { @apply bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md; }
        .chart-title { @apply text-lg font-bold text-slate-800; }
      `}</style>
    </div>
  );
};

export default SimulationResults;