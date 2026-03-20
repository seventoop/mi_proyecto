"use client";

import { useState } from "react";
import { toast } from "sonner";
import { 
    Plus, 
    Trash2, 
    ChevronUp, 
    ChevronDown, 
    Play, 
    Settings2, 
    Save, 
    X,
    Clock,
    Filter,
    Activity
} from "lucide-react";
import { updateFlowConfig } from "@/lib/actions/logictoop";
import { normalizeFlowConfig } from "@/lib/logictoop/builder";

interface LogicToopBuilderProps {
    flow: any;
}

export function LogicToopBuilder({ flow }: LogicToopBuilderProps) {
    const config = normalizeFlowConfig(flow.actions);
    const [steps, setSteps] = useState(config.steps);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

    const addStep = (type: "ACTION" | "CONDITION" | "WAIT") => {
        const newStep = {
            uid: `step-${Date.now()}`,
            type,
            label: type === "ACTION" ? "Nueva Acción" : type === "CONDITION" ? "Nueva Condición" : "Nueva Espera",
            config: type === "WAIT" ? { minutes: 30 } : {},
            conditions: []
        };
        setSteps([...steps, newStep]);
    };

    const removeStep = (index: number) => {
        const newSteps = [...steps];
        newSteps.splice(index, 1);
        setSteps(newSteps);
        if (selectedStepIndex === index) setSelectedStepIndex(null);
    };

    const moveStep = (index: number, direction: "up" | "down") => {
        const newSteps = [...steps];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= steps.length) return;
        
        const temp = newSteps[index];
        newSteps[index] = newSteps[targetIndex];
        newSteps[targetIndex] = temp;
        setSteps(newSteps);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateFlowConfig(flow.id, steps) as any;
            if (result.success) {
                toast.success("Flujo guardado correctamente");
            } else {
                toast.error("Error al guardar: " + (result.error || "Desconocido"));
            }
        } catch (error) {
            toast.error("Error fatal al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[70vh]">
            {/* Main Builder Canvas */}
            <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-6 flex justify-between items-center bg-brand-50/50">
                    <div>
                        <span className="text-xs font-black uppercase tracking-widest text-brand-600 block mb-1">Trigger Activo</span>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                            <Play className="w-5 h-5 fill-brand-500 text-brand-500" />
                            {flow.triggerType}
                        </h2>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary flex items-center gap-2 !px-8"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Guardando..." : "Guardar Flujo"}
                    </button>
                </div>

                <div className="relative pl-8 space-y-4">
                    {/* Connection Line */}
                    <div className="absolute left-[2.4rem] top-0 bottom-0 w-1 bg-slate-200 rounded-full" />

                    {steps.map((step, index) => (
                        <div 
                            key={step.uid}
                            className={`relative glass-card p-4 transition-all group ${selectedStepIndex === index ? 'ring-2 ring-brand-500 scale-[1.01]' : 'hover:scale-[1.005]'}`}
                        >
                            {/* Step Indicator */}
                            <div className="absolute -left-[1.85rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-slate-200 flex items-center justify-center font-black text-xs text-slate-400 z-10">
                                {index + 1}
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        step.type === 'ACTION' ? 'bg-blue-100 text-blue-600' :
                                        step.type === 'CONDITION' ? 'bg-amber-100 text-amber-600' :
                                        'bg-purple-100 text-purple-600'
                                    }`}>
                                        {step.type === 'ACTION' && <Activity className="w-5 h-5" />}
                                        {step.type === 'CONDITION' && <Filter className="w-5 h-5" />}
                                        {step.type === 'WAIT' && <Clock className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-black italic uppercase text-sm">{step.label}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{step.type}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => moveStep(index, 'up')} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronUp className="w-4 h-4" /></button>
                                    <button onClick={() => moveStep(index, 'down')} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronDown className="w-4 h-4" /></button>
                                    <button onClick={() => setSelectedStepIndex(index)} className="p-2 hover:bg-slate-100 rounded-lg"><Settings2 className="w-4 h-4" /></button>
                                    <button onClick={() => removeStep(index)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Step Buttons */}
                    <div className="flex flex-wrap gap-4 pt-4">
                        <button onClick={() => addStep('ACTION')} className="flex-1 py-4 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-colors text-blue-600 font-black italic uppercase text-xs">
                            <Plus className="w-5 h-5" />
                            Añadir Acción
                        </button>
                        <button onClick={() => addStep('CONDITION')} className="flex-1 py-4 border-2 border-dashed border-amber-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-amber-50 transition-colors text-amber-600 font-black italic uppercase text-xs">
                            <Plus className="w-5 h-5" />
                            Añadir Condición
                        </button>
                        <button onClick={() => addStep('WAIT')} className="flex-1 py-4 border-2 border-dashed border-purple-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-purple-50 transition-colors text-purple-600 font-black italic uppercase text-xs">
                            <Plus className="w-5 h-5" />
                            Añadir Espera
                        </button>
                    </div>
                </div>
            </div>

            {/* Step Editor Panel */}
            <div className="lg:col-span-1">
                <div className="glass-card p-6 sticky top-8">
                    {selectedStepIndex !== null ? (
                        <StepEditor 
                            step={steps[selectedStepIndex]} 
                            onChange={(updatedStep) => {
                                const newSteps = [...steps];
                                newSteps[selectedStepIndex] = updatedStep;
                                setSteps(newSteps);
                            }}
                            onClose={() => setSelectedStepIndex(null)}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <Settings2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black italic uppercase text-xs tracking-wider">Selecciona un paso para editar su configuración</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StepEditor({ step, onChange, onClose }: { step: any, onChange: (s: any) => void, onClose: () => void }) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Configurar Paso</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Nombre del Paso</label>
                    <input 
                        type="text" 
                        value={step.label}
                        onChange={(e) => onChange({ ...step, label: e.target.value })}
                        className="w-full glass-input"
                    />
                </div>

                {step.type === 'ACTION' && (
                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Tipo de Acción</label>
                        <select 
                            value={step.config.type || ''} 
                            onChange={(e) => onChange({ ...step, config: { ...step.config, type: e.target.value } })}
                            className="w-full glass-input"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="ASSIGN_LEAD">Asignar Lead</option>
                            <option value="CREATE_TASK">Crear Tarea</option>
                            <option value="NOTIFY_INTERNAL">Notificar Interno</option>
                            <option value="SEND_WHATSAPP_TEMPLATE">WhatsApp Template</option>
                            <option value="SEND_EMAIL_TEMPLATE">Email Template</option>
                            <option value="MOVE_LEAD_STAGE">Cambiar Etapa Pipeline</option>
                            <option value="ADD_AUDIT_LOG">Log de Auditoría</option>
                        </select>
                    </div>
                )}

                {step.type === 'WAIT' && (
                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Tiempo de Espera (Minutos)</label>
                        <input 
                            type="number" 
                            value={step.config.minutes || 0}
                            onChange={(e) => onChange({ ...step, config: { ...step.config, minutes: parseInt(e.target.value) } })}
                            className="w-full glass-input"
                        />
                    </div>
                )}

                {step.type === 'CONDITION' && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Campo a evaluar</label>
                            <input 
                                type="text" 
                                placeholder="p.ej. leadId, value, source"
                                value={step.config.field || ''}
                                onChange={(e) => onChange({ ...step, config: { ...step.config, field: e.target.value } })}
                                className="w-full glass-input"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Operador</label>
                            <select 
                                value={step.config.operator || 'EQUALS'}
                                onChange={(e) => onChange({ ...step, config: { ...step.config, operator: e.target.value } })}
                                className="w-full glass-input"
                            >
                                <option value="EQUALS">Es igual a</option>
                                <option value="NOT_EQUALS">No es igual a</option>
                                <option value="GREATER_THAN">Es mayor que</option>
                                <option value="LESS_THAN">Es menor que</option>
                                <option value="INCLUDES">Contiene</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Valor</label>
                            <input 
                                type="text" 
                                value={step.config.value || ''}
                                onChange={(e) => onChange({ ...step, config: { ...step.config, value: e.target.value } })}
                                className="w-full glass-input"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
