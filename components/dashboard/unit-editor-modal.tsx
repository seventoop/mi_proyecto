"use client";

import { useState, useEffect } from "react";
import {
    X, Save, Home, DollarSign, MapPin, Image, Settings, AlertCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface UnitEditorProps {
    unit: any | null; // null = new unit
    onClose: () => void;
    onSave: (data: any) => void;
}

import UnitBasicInfo from "./units/unit-basic-info";
import UnitPricingInfo from "./units/unit-pricing-info";
import UnitLocationInfo from "./units/unit-location-info";
import UnitMediaInfo from "./units/unit-media-info";
import UnitStatusInfo from "./units/unit-status-info";

type SectionId = "basicos" | "pricing" | "ubicacion" | "media" | "estado";

const sections: { id: SectionId; label: string; icon: any }[] = [
    { id: "basicos", label: "Datos Básicos", icon: Home },
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "ubicacion", label: "Ubicación", icon: MapPin },
    { id: "media", label: "Media", icon: Image },
    { id: "estado", label: "Estado", icon: Settings },
];

export default function UnitEditorModal({ unit, onClose, onSave }: UnitEditorProps) {
    const isNew = !unit;
    const [activeSection, setActiveSection] = useState<SectionId>("basicos");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        numero: unit?.numero || "",
        tipo: unit?.tipo || "LOTE",
        superficie: unit?.superficie?.toString() || "",
        frente: unit?.frente?.toString() || "",
        fondo: unit?.fondo?.toString() || "",
        esEsquina: unit?.esEsquina || false,
        orientacion: unit?.orientacion || "",
        precio: unit?.precio?.toString() || "",
        moneda: unit?.moneda || "USD",
        financiacion: {
            cuotas: "",
            anticipo: "",
            tasaInteres: "",
            ...(typeof unit?.financiacion === "object" ? unit.financiacion : {}),
        },
        etapaId: unit?.etapaId || "",
        manzanaId: unit?.manzanaId || "",
        estado: unit?.estado || "DISPONIBLE",
        responsableId: unit?.responsableId || "",
        tour360Url: unit?.tour360Url || "",
        imagenes: unit?.imagenes || [],
    });

    // Real-time validation
    useEffect(() => {
        const newErrors: Record<string, string> = {};
        if (!form.numero.trim()) newErrors.numero = "El número es obligatorio";
        if (form.superficie && parseFloat(form.superficie) <= 0) newErrors.superficie = "La superficie debe ser positiva";
        if (form.precio && parseFloat(form.precio) <= 0) newErrors.precio = "El precio debe ser positivo";
        if (form.frente && parseFloat(form.frente) <= 0) newErrors.frente = "El frente debe ser positivo";
        if (form.fondo && parseFloat(form.fondo) <= 0) newErrors.fondo = "El fondo debe ser positivo";
        setErrors(newErrors);
    }, [form]);

    const updateForm = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateFinanciacion = (key: string, value: string) => {
        setForm((prev) => ({
            ...prev,
            financiacion: { ...prev.financiacion, [key]: value },
        }));
    };

    const handleSave = () => {
        if (!form.numero.trim()) {
            setActiveSection("basicos");
            return;
        }
        onSave(form);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";
    const errorClass = "text-xs text-rose-400 mt-1 flex items-center gap-1";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                            {isNew ? "Nueva Unidad" : `Editar Unidad ${unit.numero}`}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Complete la información de la unidad</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Section tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 flex-shrink-0 overflow-x-auto">
                    {sections.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap",
                                activeSection === s.id
                                    ? "border-brand-orange text-brand-orange"
                                    : "border-transparent text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <s.icon className="w-3.5 h-3.5" />
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeSection === "basicos" && (
                        <UnitBasicInfo form={form} errors={errors} updateForm={updateForm} />
                    )}
                    {activeSection === "pricing" && (
                        <UnitPricingInfo form={form} errors={errors} updateForm={updateForm} updateFinanciacion={updateFinanciacion} />
                    )}
                    {activeSection === "ubicacion" && (
                        <UnitLocationInfo form={form} updateForm={updateForm} />
                    )}
                    {activeSection === "media" && (
                        <UnitMediaInfo form={form} updateForm={updateForm} />
                    )}
                    {activeSection === "estado" && (
                        <UnitStatusInfo form={form} updateForm={updateForm} />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="text-xs text-slate-400">
                        {Object.keys(errors).length > 0 && (
                            <span className="text-rose-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />{Object.keys(errors).length} campo(s) con errores
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            Cancelar
                        </button>
                        <button onClick={handleSave}
                            disabled={Object.keys(errors).length > 0}
                            className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            {isNew ? "Crear Unidad" : "Guardar Cambios"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
