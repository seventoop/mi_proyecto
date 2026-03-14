"use client";

import { useState, useCallback, useMemo } from "react";
import { 
    ReactFlow, 
    Background, 
    Controls, 
    Panel,
    applyEdgeChanges, 
    applyNodeChanges,
    addEdge,
    Connection,
    Edge,
    Node,
    ConnectionMode
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TriggerNode, ActionNode, ConditionNode } from "./Nodes";
import { 
    Save, 
    ChevronLeft, 
    Plus, 
    Trash2, 
    Play,
    Activity,
    Filter,
    Clock,
    X
} from "lucide-react";
import * as Icons from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { updateFlowConfig } from "@/lib/actions/logictoop";
import { serializeCanvas, validateGraph } from "@/lib/logictoop/canvas";

const nodeTypes = {
    triggerNode: TriggerNode,
    actionNode: ActionNode,
    conditionNode: ConditionNode,
};

interface LogicToopCanvasProps {
    flow: any;
    initialNodes: Node[];
    initialEdges: Edge[];
    nodeDefinitions?: any[];
}

export function LogicToopCanvas({ flow, initialNodes, initialEdges, nodeDefinitions = [] }: LogicToopCanvasProps) {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const onNodesChange = useCallback(
        (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange = useCallback(
        (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        []
    );

    const onNodeClick = (_: any, node: Node) => {
        if (node.type === "triggerNode") return;
        setSelectedNode(node);
    };

    const addNodeFromRegistry = (nodeDef: any) => {
        const id = `node-${Date.now()}`;
        const defaultConfig: any = {};
        nodeDef.configSchema?.forEach((f: any) => {
            if (f.defaultValue !== undefined) defaultConfig[f.id] = f.defaultValue;
        });

        const newNode: Node = {
            id,
            type: nodeDef.type === "CONDITION" ? "conditionNode" : "actionNode",
            position: { x: 400 + Math.random() * 50, y: 300 + Math.random() * 50 },
            data: { 
                label: nodeDef.label,
                type: nodeDef.type,
                config: defaultConfig
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNode(newNode);
    };

    const deleteSelected = () => {
        if (!selectedNode) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
    };

    const handleSave = async () => {
        const validation = validateGraph(nodes as any, edges as any);
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        setIsSaving(true);
        try {
            const serializedActions = serializeCanvas(nodes as any, edges as any);
            const res = await updateFlowConfig(flow.id, serializedActions);
            if (res.success) {
                toast.success("Flow de lienzo guardado!");
            } else {
                toast.error("Error al guardar: " + (res as any).error);
            }
        } catch (error) {
            toast.error("Error fatal al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const updateNodeData = (data: any) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            })
        );
    };

    return (
        <div className="h-[80vh] w-full relative border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-2xl">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
            >
                <Background color="#cbd5e1" gap={20} />
                <Controls />
                
                <Panel position="top-left" className="bg-white/90 backdrop-blur glass-card !p-4 border-slate-200 flex items-center gap-4">
                    <Link href="/dashboard/admin/logictoop" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-sm font-black italic uppercase tracking-tighter leading-none">{flow.nombre}</h2>
                        <span className="text-[9px] font-black uppercase text-brand-500 tracking-widest leading-none mt-1 block">{flow.triggerType}</span>
                    </div>
                </Panel>

                <Panel position="top-right" className="flex gap-2">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="btn-primary !py-2 !px-6 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Guardando..." : "Guardar Lienzo"}
                    </button>
                </Panel>

                <Panel position="bottom-center" className="glass-card !p-1 flex gap-1 bg-white/95 max-h-[300px] overflow-y-auto w-[700px] flex-wrap justify-center border-slate-200 shadow-xl scrollbar-hide">
                    {Object.entries(
                        nodeDefinitions.reduce((acc: any, node: any) => {
                            if (!acc[node.category]) acc[node.category] = [];
                            acc[node.category].push(node);
                            return acc;
                        }, {})
                    ).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]: [string, any]) => (
                        <div key={category} className="flex flex-wrap gap-1 p-1 border-r border-slate-100 last:border-0 items-center">
                            <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 rotate-180 [writing-mode:vertical-lr] px-0.5">{category}</span>
                            {items.map((node: any) => {
                                const IconComp = (Icons as any)[node.icon.charAt(0).toUpperCase() + node.icon.slice(1)] || Plus;
                                return (
                                    <button 
                                        key={node.type}
                                        onClick={() => addNodeFromRegistry(node)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg transition-all font-bold text-[9px] uppercase border border-slate-100 shadow-sm ${
                                            node.category === 'AI' ? 'bg-brand-50/30' : 
                                            node.category === 'Integrations' ? 'bg-indigo-50/30' : 
                                            node.category === 'Triggers' ? 'bg-amber-50/30' : 
                                            node.category === 'Agents' ? 'bg-emerald-50/30' : ''
                                        }`}
                                        title={node.description}
                                    >
                                        <IconComp className="w-3 h-3 text-brand-500" /> {node.label}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </Panel>
            </ReactFlow>

            {/* Dynamic Inspector Sidebar */}
            {selectedNode && (
                <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-[100] overflow-y-auto p-6 animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black italic uppercase tracking-tighter text-xl text-brand-600">Configurar</h3>
                        <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nombre Identificador</label>
                            <input 
                                type="text" 
                                value={(selectedNode.data as any).label || ''}
                                onChange={(e) => updateNodeData({ label: e.target.value })}
                                className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder:text-slate-300"
                                placeholder="Ej: Enviar Bienvenida"
                            />
                        </div>

                        {/* Dynamic Form Fields */}
                        <div className="space-y-4">
                            {(nodeDefinitions.find(d => d.type === (selectedNode.data as any).type)?.configSchema || []).map((field: any) => (
                                <div key={field.id} className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                        {field.label}
                                        {field.required && <span className="text-rose-500">*</span>}
                                    </label>
                                    
                                    {field.type === "textarea" ? (
                                        <textarea 
                                            value={(selectedNode.data as any).config?.[field.id] || ''}
                                            onChange={(e) => updateNodeData({ 
                                                config: { ...(selectedNode.data as any).config, [field.id]: e.target.value } 
                                            })}
                                            className="w-full glass-input text-xs min-h-[80px]"
                                            placeholder={field.placeholder}
                                        />
                                    ) : field.type === "select" ? (
                                        <select 
                                            value={(selectedNode.data as any).config?.[field.id] || ''}
                                            onChange={(e) => updateNodeData({ 
                                                config: { ...(selectedNode.data as any).config, [field.id]: e.target.value } 
                                            })}
                                            className="w-full glass-input text-xs"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {(field.options || []).map((opt: any) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : field.type === "checkbox" ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={!!(selectedNode.data as any).config?.[field.id]}
                                                onChange={(e) => updateNodeData({ 
                                                    config: { ...(selectedNode.data as any).config, [field.id]: e.target.checked } 
                                                })}
                                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                            />
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{field.placeholder || 'Activar'}</span>
                                        </div>
                                    ) : (
                                        <input 
                                            type={field.type} 
                                            value={(selectedNode.data as any).config?.[field.id] ?? (field.type === 'number' ? 0 : '')}
                                            onChange={(e) => updateNodeData({ 
                                                config: { ...(selectedNode.data as any).config, [field.id]: field.type === 'number' ? Number(e.target.value) : e.target.value } 
                                            })}
                                            className="w-full glass-input text-xs"
                                            placeholder={field.placeholder}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex flex-col gap-2">
                            <span className="text-[8px] font-black text-slate-300 uppercase italic">Tipo: {(selectedNode.data as any).type}</span>
                            <button 
                                onClick={deleteSelected}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors font-black uppercase text-[10px] italic border border-rose-100 shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar Nodo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
