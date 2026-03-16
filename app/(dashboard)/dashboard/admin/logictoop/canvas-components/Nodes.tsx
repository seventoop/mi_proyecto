"use client";

import { Handle, Position } from "@xyflow/react";
import { Activity, Play, Filter, Clock, ChevronRight } from "lucide-react";

export function TriggerNode({ data }: any) {
    return (
        <div className="glass-card !p-0 overflow-hidden min-w-[200px] border-emerald-500/30">
            <div className="bg-emerald-500/10 p-3 border-b border-emerald-500/20 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Trigger</span>
            </div>
            <div className="p-4">
                <h3 className="text-sm font-black italic uppercase tracking-tighter">{data.label || "System Event"}</h3>
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3" />
        </div>
    );
}

export function ActionNode({ data, selected }: any) {
    return (
        <div className={`glass-card !p-0 overflow-hidden min-w-[200px] transition-all ${selected ? 'ring-2 ring-brand-500 scale-105' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-slate-300" />
            <div className="bg-blue-500/10 p-2 border-b border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-600" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-blue-700">Acción</span>
                </div>
                {data.config?.minutes && <Clock className="w-3 h-3 text-purple-500" />}
            </div>
            <div className="p-3">
                <h3 className="text-[11px] font-black italic uppercase truncate">{data.label || data.type}</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                    {data.type === "WAIT" ? `Espera ${data.config.minutes}m` : data.type}
                </p>
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-brand-500" />
        </div>
    );
}

export function ConditionNode({ data, selected }: any) {
    return (
        <div className={`glass-card !p-0 overflow-hidden min-w-[220px] transition-all border-amber-500/30 ${selected ? 'ring-2 ring-amber-500 scale-105' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-slate-300" />
            <div className="bg-amber-500/10 p-2 border-b border-amber-500/20 flex items-center gap-2">
                <Filter className="w-3 h-3 text-amber-600" />
                <span className="text-[9px] font-black uppercase tracking-tighter text-amber-700">Condición</span>
            </div>
            <div className="p-3">
                <h3 className="text-[11px] font-black italic uppercase truncate">{data.label || "Evaluar"}</h3>
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1 rounded uppercase tracking-tighter">
                        {data.config?.field} {data.config?.operator} {data.config?.value}
                    </span>
                </div>
            </div>
            
            <div className="flex justify-between px-4 pb-2">
                <div className="relative">
                    <span className="text-[8px] font-black uppercase text-emerald-600 absolute -bottom-4 -left-1">TRUE</span>
                    <Handle type="source" position={Position.Bottom} id="true" className="!bg-emerald-500 !left-0" />
                </div>
                <div className="relative">
                    <span className="text-[8px] font-black uppercase text-rose-600 absolute -bottom-4 -right-1">FALSE</span>
                    <Handle type="source" position={Position.Bottom} id="false" className="!bg-rose-500 !left-auto !right-0" />
                </div>
            </div>
        </div>
    );
}
