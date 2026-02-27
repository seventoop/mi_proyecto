import { Target } from "lucide-react";

export default function OportunidadesPage() {
    const etapas = [
        {
            nombre: "Nuevo", color: "border-slate-500", items: [
                { lead: "Juan Pérez", proyecto: "Los Álamos", valor: "$45,000", prob: 20 },
                { lead: "Ana López", proyecto: "Torres Parque", valor: "$120,000", prob: 15 },
            ]
        },
        {
            nombre: "Contactado", color: "border-brand-500", items: [
                { lead: "María García", proyecto: "Los Álamos", valor: "$38,000", prob: 35 },
            ]
        },
        {
            nombre: "Calificado", color: "border-brand-500", items: [
                { lead: "Pedro Sánchez", proyecto: "Villa Serrana", valor: "$52,000", prob: 50 },
                { lead: "Laura Díaz", proyecto: "Torres Parque", valor: "$95,000", prob: 55 },
            ]
        },
        {
            nombre: "Visita", color: "border-amber-500", items: [
                { lead: "Roberto Ruiz", proyecto: "Los Álamos", valor: "$41,000", prob: 65 },
            ]
        },
        {
            nombre: "Negociación", color: "border-orange-500", items: [
                { lead: "Carmen Torres", proyecto: "Los Álamos", valor: "$48,000", prob: 80 },
            ]
        },
        {
            nombre: "Reserva", color: "border-emerald-500", items: [
                { lead: "Diego Morales", proyecto: "Torres Parque", valor: "$105,000", prob: 90 },
            ]
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                    Pipeline de Oportunidades
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Arrastra oportunidades entre etapas del proceso de venta
                </p>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4">
                {etapas.map((etapa) => (
                    <div
                        key={etapa.nombre}
                        className={`flex-shrink-0 w-72 border-t-2 ${etapa.color} rounded-xl bg-slate-100/50 dark:bg-slate-800/30`}
                    >
                        <div className="p-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {etapa.nombre}
                            </h3>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-lg">
                                {etapa.items.length}
                            </span>
                        </div>
                        <div className="px-3 pb-3 space-y-2">
                            {etapa.items.map((item, i) => (
                                <div
                                    key={i}
                                    className="glass-card p-4 cursor-grab active:cursor-grabbing hover:border-brand-500/30"
                                >
                                    <p className="text-sm font-semibold text-slate-700 dark:text-white">
                                        {item.lead}
                                    </p>
                                    <p className="text-xs text-slate-700 dark:text-slate-400 mt-1">{item.proyecto}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-sm font-bold text-brand-400">
                                            {item.valor}
                                        </span>
                                        <span className="text-xs text-slate-700 dark:text-slate-400">
                                            {item.prob}% prob.
                                        </span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400"
                                            style={{ width: `${item.prob}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
