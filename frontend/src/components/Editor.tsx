
import React, { useState, useRef, useEffect } from 'react';
import { RoomConfig, WallOrientation, OpeningType, Opening } from '../types';
import { MATERIAL_PRESETS } from '../constants';
import { Trash2, Plus, Settings2, MousePointer2, LayoutTemplate, DoorOpen, Square, ChevronDown, ChevronRight, Ruler, ArrowRightFromLine, Wind, Layers, Thermometer } from 'lucide-react';

interface EditorProps {
  room: RoomConfig;
  onUpdate: (room: RoomConfig) => void;
}

type Tool = 'select' | 'window' | 'door' | 'draw';

const Editor: React.FC<EditorProps> = ({ room, onUpdate }) => {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [hoveredWall, setHoveredWall] = useState<WallOrientation | null>(null);
  const [draggingOpeningId, setDraggingOpeningId] = useState<string | null>(null);
  
  // Sidebar State
  const [expandedWall, setExpandedWall] = useState<WallOrientation | null>(WallOrientation.South);

  const svgRef = useRef<SVGSVGElement>(null);
  
  // Drawing state (Room Resize)
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{x: number, y: number} | null>(null);

  // Constants
  const CANVAS_SIZE = 600;
  const WALL_THICKNESS_M = 0.3;
  const PADDING = 80;
  
  // Dynamic Scale
  const maxDim = Math.max(room.width, room.depth) + 2;
  const fitScale = (CANVAS_SIZE - (PADDING * 2)) / maxDim;
  const FIXED_SCALE = 50; 
  const scale = activeTool === 'draw' ? FIXED_SCALE : fitScale;

  // Centering logic
  const drawWidth = room.width * scale;
  const drawDepth = room.depth * scale;
  const originX = (CANVAS_SIZE - drawWidth) / 2;
  const originY = (CANVAS_SIZE - drawDepth) / 2;

  // Handlers
  const handleDimChange = (field: keyof RoomConfig, value: number) => {
    onUpdate({ ...room, [field]: value });
  };
  
  const handleWallLengthChange = (wall: WallOrientation, length: number) => {
    if (wall === WallOrientation.North || wall === WallOrientation.South) {
      onUpdate({ ...room, width: length });
    } else {
      onUpdate({ ...room, depth: length });
    }
  };

  const updateAllWallsUValue = (val: number) => {
    onUpdate({ 
      ...room, 
      wallUValue: val,
      wallSpecificUValues: {
        [WallOrientation.North]: val,
        [WallOrientation.South]: val,
        [WallOrientation.East]: val,
        [WallOrientation.West]: val,
      }
    });
  };

  const updateSpecificWallUValue = (wall: WallOrientation, val: number) => {
    const currentSpecs = room.wallSpecificUValues || {
      [WallOrientation.North]: room.wallUValue,
      [WallOrientation.South]: room.wallUValue,
      [WallOrientation.East]: room.wallUValue,
      [WallOrientation.West]: room.wallUValue,
    };
    onUpdate({
      ...room,
      wallSpecificUValues: {
        ...currentSpecs,
        [wall]: val
      }
    });
  };

  const addOpeningToWall = (wall: WallOrientation, type: OpeningType) => {
    const defaultWidth = type === OpeningType.Window ? 1.5 : 0.9;
    const defaultHeight = type === OpeningType.Window ? 1.2 : 2.1;
    
    // Auto-calculate a safe offset (middle of wall)
    const wallLen = (wall === WallOrientation.North || wall === WallOrientation.South) ? room.width : room.depth;
    const offset = (wallLen / 2) - (defaultWidth / 2);

    const newOp: Opening = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      width: defaultWidth,
      height: defaultHeight,
      offset: parseFloat(offset.toFixed(2)),
      uValue: type === OpeningType.Window ? 1.6 : 1.8,
      wall: wall,
    };
    onUpdate({ ...room, openings: [...room.openings, newOp] });
  };

  // --- Interaction Logic (Canvas) ---

  const getMousePos = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    if (activeTool === 'draw') {
      setDragStart(pos);
      setCurrentDrag(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    // Dragging Room Shape
    if (activeTool === 'draw' && dragStart) {
      setCurrentDrag(pos);
      return;
    }

    // Dragging Opening
    if (activeTool === 'select' && draggingOpeningId) {
      const op = room.openings.find(o => o.id === draggingOpeningId);
      if (!op) return;

      let newOffset = op.offset;
      const wallLen = (op.wall === 'North' || op.wall === 'South') ? room.width : room.depth;
      
      // Calculate new offset based on mouse position relative to wall
      if (op.wall === 'North') {
        newOffset = (pos.x - originX) / scale - (op.width / 2);
      } else if (op.wall === 'South') {
        newOffset = (pos.x - originX) / scale - (op.width / 2); 
      } else if (op.wall === 'East') {
        newOffset = (pos.y - originY) / scale - (op.width / 2);
      } else if (op.wall === 'West') {
        newOffset = (pos.y - originY) / scale - (op.width / 2);
      }

      // Clamp to wall
      newOffset = Math.max(0, Math.min(newOffset, wallLen - op.width));

      onUpdate({
        ...room,
        openings: room.openings.map(o => o.id === draggingOpeningId ? { ...o, offset: newOffset } : o)
      });
    }
  };

  const handleMouseUp = () => {
    // Finish Room Draw
    if (activeTool === 'draw' && dragStart && currentDrag) {
      const w = Math.abs(currentDrag.x - dragStart.x) / FIXED_SCALE;
      const h = Math.abs(currentDrag.y - dragStart.y) / FIXED_SCALE;
      if (w > 1 && h > 1) {
        onUpdate({
          ...room,
          width: parseFloat(w.toFixed(1)),
          depth: parseFloat(h.toFixed(1))
        });
      }
      setDragStart(null);
      setCurrentDrag(null);
    }
    setDraggingOpeningId(null);
  };

  const handleWallClick = (wall: WallOrientation, e: React.MouseEvent) => {
    if (activeTool === 'select' || activeTool === 'draw') return;

    const pos = getMousePos(e);
    let offset = 0;
    const defaultWidth = activeTool === 'window' ? 1.5 : 0.9;

    // Calculate click position along the wall
    if (wall === 'North' || wall === 'South') {
       offset = (pos.x - originX) / scale - (defaultWidth / 2);
    } else {
       offset = (pos.y - originY) / scale - (defaultWidth / 2);
    }

    // Clamp
    const wallLen = (wall === 'North' || wall === 'South') ? room.width : room.depth;
    offset = Math.max(0, Math.min(offset, wallLen - defaultWidth));

    const newOp: Opening = {
      id: Math.random().toString(36).substr(2, 9),
      type: activeTool === 'window' ? OpeningType.Window : OpeningType.Door,
      width: defaultWidth,
      height: activeTool === 'window' ? 1.2 : 2.1,
      offset: parseFloat(offset.toFixed(2)),
      uValue: activeTool === 'window' ? 1.6 : 1.8,
      wall: wall,
    };
    onUpdate({ ...room, openings: [...room.openings, newOp] });
    setExpandedWall(wall); // Auto expand that wall in sidebar
  };

  const removeOpening = (id: string) => {
    onUpdate({ ...room, openings: room.openings.filter(o => o.id !== id) });
  };

  const updateOpening = (id: string, updates: Partial<Opening>) => {
    onUpdate({
      ...room,
      openings: room.openings.map(o => (o.id === id ? { ...o, ...updates } : o)),
    });
  };


  // --- Render Helpers ---

  const renderDimensionInput = (x: number, y: number, value: number, field: 'width' | 'depth') => {
    return (
      <foreignObject x={x - 30} y={y - 12} width="60" height="24">
        <input 
          type="number" 
          value={value} 
          onChange={(e) => handleDimChange(field, parseFloat(e.target.value))}
          className="w-full h-full text-center text-xs font-bold text-slate-700 bg-white/90 border border-slate-300 rounded shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </foreignObject>
    );
  };

  const renderDimensionLines = () => {
     if (activeTool === 'draw') return null;
     const offset = 30;
     return (
       <g>
         {/* Width Top */}
         <line x1={originX} y1={originY - offset} x2={originX + drawWidth} y2={originY - offset} stroke="#cbd5e1" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
         <line x1={originX} y1={originY} x2={originX} y2={originY - offset - 5} stroke="#cbd5e1" strokeDasharray="2 2" />
         <line x1={originX + drawWidth} y1={originY} x2={originX + drawWidth} y2={originY - offset - 5} stroke="#cbd5e1" strokeDasharray="2 2" />
         {renderDimensionInput(originX + drawWidth / 2, originY - offset, room.width, 'width')}

         {/* Depth Left */}
         <line x1={originX - offset} y1={originY} x2={originX - offset} y2={originY + drawDepth} stroke="#cbd5e1" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
         <line x1={originX} y1={originY} x2={originX - offset - 5} y2={originY} stroke="#cbd5e1" strokeDasharray="2 2" />
         <line x1={originX} y1={originY + drawDepth} x2={originX - offset - 5} y2={originY + drawDepth} stroke="#cbd5e1" strokeDasharray="2 2" />
         {renderDimensionInput(originX - offset, originY + drawDepth / 2, room.depth, 'depth')}
       </g>
     );
  };

  const renderHitWalls = () => {
    if (activeTool === 'draw') return null;

    const thickness = 20 * (scale / FIXED_SCALE);
    
    const walls = [
      { id: WallOrientation.North, x: originX, y: originY - thickness/2, w: drawWidth, h: thickness },
      { id: WallOrientation.South, x: originX, y: originY + drawDepth - thickness/2, w: drawWidth, h: thickness },
      { id: WallOrientation.West, x: originX - thickness/2, y: originY, w: thickness, h: drawDepth },
      { id: WallOrientation.East, x: originX + drawWidth - thickness/2, y: originY, w: thickness, h: drawDepth },
    ];

    return walls.map(w => (
      <rect 
        key={w.id}
        x={w.x} y={w.y} width={w.w} height={w.h}
        fill={hoveredWall === w.id ? (activeTool === 'window' ? 'rgba(56, 189, 248, 0.3)' : activeTool === 'door' ? 'rgba(251, 146, 60, 0.3)' : 'transparent') : 'transparent'}
        onMouseEnter={() => setHoveredWall(w.id as WallOrientation)}
        onMouseLeave={() => setHoveredWall(null)}
        onClick={(e) => handleWallClick(w.id as WallOrientation, e)}
        className={activeTool === 'window' || activeTool === 'door' ? 'cursor-copy' : ''}
      />
    ));
  };

  const renderOpenings = () => {
     return room.openings.map(op => {
       const thickness = WALL_THICKNESS_M * scale;
       const opWidthPx = op.width * scale;
       const offsetPx = op.offset * scale;

       let x=0, y=0, rot=0;
       if (op.wall === 'North') {
         x = originX + offsetPx + opWidthPx/2; y = originY - thickness/2; rot = 0;
       } else if (op.wall === 'South') {
         x = originX + offsetPx + opWidthPx/2; y = originY + drawDepth + thickness/2; rot = 180;
       } else if (op.wall === 'East') {
         x = originX + drawWidth + thickness/2; y = originY + offsetPx + opWidthPx/2; rot = 90;
       } else if (op.wall === 'West') {
         x = originX - thickness/2; y = originY + offsetPx + opWidthPx/2; rot = -90;
       }

       const isSelected = draggingOpeningId === op.id;

       return (
         <g 
            key={op.id} 
            transform={`translate(${x}, ${y}) rotate(${rot})`}
            onMouseDown={(e) => {
              if (activeTool === 'select') {
                e.stopPropagation();
                setDraggingOpeningId(op.id);
                setExpandedWall(op.wall); // Expand sidebar
              }
            }}
            className={activeTool === 'select' ? 'cursor-move' : ''}
         >
            {isSelected && <rect x={-opWidthPx/2 - 2} y={-thickness/2 - 3} width={opWidthPx + 4} height={thickness + 6} fill="none" stroke="#10b981" strokeWidth="2" />}
            
            <rect x={-opWidthPx/2} y={-thickness/2 - 1} width={opWidthPx} height={thickness + 2} fill="#f8fafc" stroke="none" />
            <line x1={-opWidthPx/2} y1={-thickness/2} x2={-opWidthPx/2} y2={thickness/2} stroke="#334155" strokeWidth="2" />
            <line x1={opWidthPx/2} y1={-thickness/2} x2={opWidthPx/2} y2={thickness/2} stroke="#334155" strokeWidth="2" />

            {op.type === OpeningType.Window ? (
              <g>
                <rect x={-opWidthPx/2} y={-2} width={opWidthPx} height={4} fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
                <line x1={-opWidthPx/2} y1={0} x2={opWidthPx/2} y2={0} stroke="#0ea5e9" strokeWidth="1" />
              </g>
            ) : (
              <g>
                <rect x={-opWidthPx/2} y={-thickness/2} width={5} height={opWidthPx} fill="#fed7aa" stroke="#c2410c" strokeWidth="1" />
                <path d={`M ${-opWidthPx/2} ${-thickness/2} Q ${-opWidthPx/2 + opWidthPx} ${-thickness/2} ${-opWidthPx/2 + opWidthPx} ${-thickness/2 + opWidthPx}`} fill="none" stroke="#fdba74" strokeWidth="1" strokeDasharray="4 2" />
              </g>
            )}
         </g>
       );
     });
  };

  // Logic to determine if current values match a preset
  const currentWallPresetValue = MATERIAL_PRESETS.walls.find(m => Math.abs(m.uValue - room.wallUValue) < 0.01)?.uValue;
  const currentWallSelect = currentWallPresetValue !== undefined ? currentWallPresetValue : "custom";

  const currentInfiltrationPresetValue = MATERIAL_PRESETS.infiltration.find(m => Math.abs(m.value - room.infiltrationRate) < 0.01)?.value;
  const currentInfiltrationSelect = currentInfiltrationPresetValue !== undefined ? currentInfiltrationPresetValue : "custom";

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      
      {/* --- Left Panel: Wall Inspector --- */}
      <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-10">
        
        {/* Global Config */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings2 size={16} className="text-blue-600" /> General Construction</h3>
           
           <div className="space-y-5">
             {/* Wall Material Group */}
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                   <Layers size={12}/> Global Wall Material
                </label>
                <div className="space-y-2">
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      onChange={(e) => {
                          if (e.target.value !== 'custom') {
                              updateAllWallsUValue(parseFloat(e.target.value));
                          }
                      }}
                      value={currentWallSelect}
                    >
                        <option value="" disabled>Set All Walls To...</option>
                        {MATERIAL_PRESETS.walls.map(m => (
                          <option key={m.name} value={m.uValue}>{m.name}</option>
                        ))}
                        <option value="custom">Custom (See below)</option>
                    </select>
                    
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2">
                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">U-Value:</span>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={room.wallUValue} 
                            onChange={(e) => updateAllWallsUValue(parseFloat(e.target.value))} 
                            className="w-full p-1.5 bg-transparent text-xs font-mono font-medium outline-none"
                        />
                        <span className="text-[10px] text-slate-400">W/m²K</span>
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">Use this to set a baseline. You can override individual walls below.</p>
             </div>

             {/* Air Tightness Group */}
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                   <Wind size={12}/> Air Tightness
                </label>
                <div className="space-y-2">
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      onChange={(e) => {
                          if (e.target.value !== 'custom') {
                              onUpdate({ ...room, infiltrationRate: parseFloat(e.target.value) });
                          }
                      }}
                      value={currentInfiltrationSelect}
                    >
                        <option value="" disabled>Select Permeability...</option>
                        {MATERIAL_PRESETS.infiltration.map(m => (
                          <option key={m.name} value={m.value}>{m.name}</option>
                        ))}
                        <option value="custom">Custom Leakage Rate</option>
                    </select>
                    
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2">
                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">Leakage:</span>
                        <input 
                            type="number" 
                            step="0.1" 
                            value={room.infiltrationRate} 
                            onChange={(e) => onUpdate({ ...room, infiltrationRate: parseFloat(e.target.value) })} 
                            className="w-full p-1.5 bg-transparent text-xs font-mono font-medium outline-none"
                        />
                        <span className="text-[10px] text-slate-400">ACH</span>
                    </div>
                </div>
             </div>

             {/* Dimensions Group */}
             <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Ceiling Height</label>
                 <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={room.height} onChange={(e) => handleDimChange('height', +e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" />
                    <span className="text-xs text-slate-400">m</span>
                 </div>
             </div>
           </div>
        </div>

        {/* Wall Configurator */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <LayoutTemplate size={16} className="text-indigo-500" />
              Wall & Opening Inspector
            </h3>
          </div>
          
          <div className="divide-y divide-slate-100">
             {Object.values(WallOrientation).map((wall) => {
               const isExpanded = expandedWall === wall;
               const wallOpenings = room.openings.filter(o => o.wall === wall);
               const wallLength = (wall === 'North' || wall === 'South') ? room.width : room.depth;
               // Get specific U-value or fall back to global
               const currentWallUValue = room.wallSpecificUValues ? room.wallSpecificUValues[wall] : room.wallUValue;
               
               return (
                 <div key={wall} className="bg-white transition-colors">
                    <button 
                       onClick={() => setExpandedWall(isExpanded ? null : wall)}
                       className={`w-full flex items-center justify-between p-3 text-sm font-medium transition-colors ${isExpanded ? 'bg-indigo-50 text-indigo-900' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                       <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>{wall} Side</span>
                       </div>
                       <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 font-mono">U: {currentWallUValue}</span>
                          <span className="text-slate-300">|</span>
                          {wallOpenings.length > 0 ? (
                            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{wallOpenings.length} items</span>
                          ) : (
                            <span className="text-slate-400">Empty</span>
                          )}
                       </div>
                    </button>

                    {isExpanded && (
                       <div className="p-4 bg-indigo-50/30 space-y-4">
                          {/* Wall Geometry & Physics */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Ruler size={10}/> Length (m)</label>
                                <input 
                                  type="number" step="0.1" 
                                  value={wallLength} 
                                  onChange={(e) => handleWallLengthChange(wall, +e.target.value)}
                                  className="w-full mt-1 p-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Thermometer size={10}/> U-Value</label>
                                <input 
                                  type="number" step="0.01" 
                                  value={currentWallUValue} 
                                  onChange={(e) => updateSpecificWallUValue(wall, +e.target.value)}
                                  className="w-full mt-1 p-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-mono"
                                />
                             </div>
                          </div>

                          <div className="flex gap-2 mb-2">
                             <button 
                                onClick={() => addOpeningToWall(wall, OpeningType.Window)}
                                className="flex-1 py-1.5 bg-sky-100 text-sky-700 rounded text-[10px] font-bold hover:bg-sky-200 flex justify-center items-center gap-1"
                              >
                                <Plus size={10} /> Add Window
                              </button>
                              <button 
                                onClick={() => addOpeningToWall(wall, OpeningType.Door)}
                                className="flex-1 py-1.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold hover:bg-orange-200 flex justify-center items-center gap-1"
                              >
                                <Plus size={10} /> Add Door
                              </button>
                          </div>

                          {/* Openings List */}
                          <div className="space-y-2">
                             {wallOpenings.length === 0 ? (
                               <div className="text-center py-2 border-2 border-dashed border-slate-200 rounded text-[10px] text-slate-400">
                                 No openings on this wall
                               </div>
                             ) : (
                               wallOpenings.map(op => (
                                 <div key={op.id} className="bg-white border border-slate-200 rounded p-2 shadow-sm group">
                                    <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                                       <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                         {op.type === OpeningType.Window ? <LayoutTemplate size={12} className="text-sky-500"/> : <DoorOpen size={12} className="text-orange-500"/>}
                                         {op.type}
                                       </div>
                                       <button onClick={() => removeOpening(op.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                       <div>
                                          <label className="text-[9px] text-slate-400 block">Width</label>
                                          <input 
                                            type="number" step="0.1"
                                            value={op.width} onChange={(e) => updateOpening(op.id, {width: +e.target.value})}
                                            className="w-full text-xs p-1 border border-slate-200 rounded"
                                          />
                                       </div>
                                       <div>
                                          <label className="text-[9px] text-slate-400 block">Height</label>
                                          <input 
                                            type="number" step="0.1"
                                            value={op.height} onChange={(e) => updateOpening(op.id, {height: +e.target.value})}
                                            className="w-full text-xs p-1 border border-slate-200 rounded"
                                          />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                       <div>
                                          <label className="text-[9px] text-emerald-600 block font-bold flex items-center gap-1" title="Distance from start"><ArrowRightFromLine size={8}/> Offset</label>
                                          <input 
                                            type="number" step="0.1"
                                            value={op.offset} onChange={(e) => updateOpening(op.id, {offset: +e.target.value})}
                                            className="w-full text-xs p-1 border border-emerald-200 focus:border-emerald-500 rounded bg-emerald-50/30"
                                          />
                                       </div>
                                       <div>
                                          <label className="text-[9px] text-blue-600 block font-bold flex items-center gap-1" title="Thermal Transmittance"><Thermometer size={8}/> U-Value</label>
                                          <input 
                                            type="number" step="0.1"
                                            value={op.uValue} onChange={(e) => updateOpening(op.id, {uValue: +e.target.value})}
                                            className="w-full text-xs p-1 border border-blue-200 focus:border-blue-500 rounded bg-blue-50/30 font-mono"
                                          />
                                       </div>
                                    </div>
                                 </div>
                               ))
                             )}
                          </div>
                       </div>
                    )}
                 </div>
               );
             })}
          </div>
        </div>

      </div>

      {/* --- Right Panel: Canvas & Toolbar --- */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col relative overflow-hidden shadow-inner h-[600px] lg:h-auto">
         
         {/* Toolbar */}
         <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-full px-2 py-1.5 flex items-center gap-1 z-10">
            <button 
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-full transition-all ${activeTool === 'select' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Select & Move (V)"
            >
              <MousePointer2 size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => setActiveTool('window')}
              className={`p-2 rounded-full transition-all ${activeTool === 'window' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Add Window (W)"
            >
              <LayoutTemplate size={18} />
            </button>
            <button 
              onClick={() => setActiveTool('door')}
              className={`p-2 rounded-full transition-all ${activeTool === 'door' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Add Door (D)"
            >
              <DoorOpen size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => { setActiveTool('draw'); setDragStart(null); }}
              className={`p-2 rounded-full transition-all ${activeTool === 'draw' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Resize Room Shape (R)"
            >
              <Square size={18} />
            </button>
         </div>

         {/* Canvas Area */}
         <div className="flex-1 flex items-center justify-center bg-slate-50 overflow-hidden relative select-none">
            <div className="absolute inset-0 pointer-events-none opacity-10" 
                 style={{ 
                   backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)`, 
                   backgroundSize: `${20}px ${20}px` 
                 }}>
            </div>

            <svg 
              ref={svgRef}
              viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
              width="100%" 
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              className={`max-w-[${CANVAS_SIZE}px] max-h-[${CANVAS_SIZE}px] overflow-visible drop-shadow-xl transition-all duration-300`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
               <defs>
                 <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                   <line x1="0" y1="0" x2="0" y2="8" style={{stroke:'#cbd5e1', strokeWidth:1}} />
                 </pattern>
                 <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                   <path d="M0,0 L6,3 L0,6 L0,0" fill="#cbd5e1" />
                 </marker>
               </defs>

               {/* -- MAIN DRAWING -- */}
               <g>
                  {/* Walls */}
                  <rect 
                      x={originX - (WALL_THICKNESS_M*scale)} y={originY - (WALL_THICKNESS_M*scale)} 
                      width={drawWidth + (WALL_THICKNESS_M*scale*2)} height={drawDepth + (WALL_THICKNESS_M*scale*2)} 
                      fill="url(#hatch)" stroke="#334155" strokeWidth="2"
                  />
                  <rect 
                      x={originX} y={originY} width={drawWidth} height={drawDepth} 
                      fill="#ffffff" stroke="#334155" strokeWidth="2"
                  />

                  {/* Openings */}
                  {renderOpenings()}

                  {/* Hit Zones for Click-to-Add */}
                  {renderHitWalls()}

                  {/* Dimensions */}
                  {renderDimensionLines()}
                  
                  {/* Center Label */}
                  <g transform={`translate(${originX + drawWidth/2}, ${originY + drawDepth/2})`}>
                     <text textAnchor="middle" y="-5" className="text-xs font-bold fill-slate-300 pointer-events-none uppercase tracking-widest">Area</text>
                     <text textAnchor="middle" y="15" className="text-lg font-bold fill-slate-400 pointer-events-none">{(room.width * room.depth).toFixed(1)} m²</text>
                  </g>
               </g>

               {/* -- DRAG PREVIEW (Room Resize) -- */}
               {activeTool === 'draw' && dragStart && currentDrag && (
                  <g>
                    <rect 
                      x={Math.min(dragStart.x, currentDrag.x)} y={Math.min(dragStart.y, currentDrag.y)} 
                      width={Math.abs(currentDrag.x - dragStart.x)} height={Math.abs(currentDrag.y - dragStart.y)} 
                      fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5"
                    />
                     <rect x={Math.min(dragStart.x, currentDrag.x) + Math.abs(currentDrag.x - dragStart.x)/2 - 30} y={Math.min(dragStart.y, currentDrag.y) - 25} width="60" height="20" rx="4" fill="#10b981" />
                     <text x={Math.min(dragStart.x, currentDrag.x) + Math.abs(currentDrag.x - dragStart.x)/2} y={Math.min(dragStart.y, currentDrag.y) - 11} textAnchor="middle" className="text-xs font-bold fill-white">
                        {(Math.abs(currentDrag.x - dragStart.x) / FIXED_SCALE).toFixed(1)}m
                     </text>
                  </g>
               )}
            </svg>
            
            {/* Tooltip hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-slate-500 border border-slate-200">
               {activeTool === 'select' && "Drag windows/doors to move them"}
               {activeTool === 'window' && "Click on any wall to add a window"}
               {activeTool === 'door' && "Click on any wall to add a door"}
               {activeTool === 'draw' && "Drag to redraw room shape"}
            </div>
         </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default Editor;
