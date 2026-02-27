import { cn } from "@/lib/utils";
import { MapPin, Home, MoreVertical } from "lucide-react";

interface DevelopmentCardProps {
    nombre: string;
    ubicacion: string;
    estado: string;
    tipo: string;
    totalUnidades: number;
    disponibles: number;
    reservadas: number;
    vendidas: number;
    imagenPortada?: string;
}

const estadoStyles: Record<string, string> = {
    PLANIFICACION: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    EN_VENTA: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    FINALIZADO: "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400",
};

const estadoLabels: Record<string, string> = {
    PLANIFICACION: "Planificación",
    EN_VENTA: "En Venta",
    FINALIZADO: "Finalizado",
};

export default function DevelopmentCard({
    nombre,
    ubicacion,
    estado,
    tipo,
    totalUnidades,
    disponibles,
    reservadas,
    vendidas,
}: DevelopmentCardProps) {
    const porcentajeVendido = totalUnidades > 0
        ? Math.round(((reservadas + vendidas) / totalUnidades) * 100)
        : 0;

    return (
        <div className="glass-card overflow-hidden group">
            {/* Image placeholder */}
            <div className="h-40 bg-gradient-to-br from-brand-600/20 to-brand-800/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute bottom-3 left-3 flex gap-2">
                    <span
                        className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-lg",
                            estadoStyles[estado] || estadoStyles.PLANIFICACION
                        )}
                    >
                        {estadoLabels[estado] || estado}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/20 text-white">
                        {tipo === "URBANIZACION" ? "Urbanización" : "Departamentos"}
                    </span>
                </div>
                <button className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                    <MoreVertical className="w-4 h-4 text-white" />
                </button>
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-brand-500 transition-colors">
                    {nombre}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{ubicacion}</span>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">
                            Progreso de venta
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {porcentajeVendido}%
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${porcentajeVendido}%` }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-center">
                        <p className="text-lg font-bold text-emerald-500">{disponibles}</p>
                        <p className="text-xs text-slate-400">Disponibles</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-amber-500">{reservadas}</p>
                        <p className="text-xs text-slate-400">Reservadas</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-rose-500">{vendidas}</p>
                        <p className="text-xs text-slate-400">Vendidas</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
