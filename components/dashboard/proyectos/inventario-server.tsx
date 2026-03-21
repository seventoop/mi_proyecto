import prisma from "@/lib/db";
import { cn } from "@/lib/utils";
import { Prisma } from "@prisma/client";

interface InventarioServerProps {
    proyectoId: string;
}

type UnidadWithRelations = Prisma.UnidadGetPayload<{
    include: {
        manzana: {
            include: {
                etapa: true
            }
        }
    }
}>;

export default async function InventarioServer({ proyectoId }: InventarioServerProps) {
    const unidades = await prisma.unidad.findMany({
        where: {
            manzana: {
                etapa: {
                    proyectoId: proyectoId
                }
            }
        },
        include: {
            manzana: {
                include: {
                    etapa: true
                }
            }
        }
    }) as UnidadWithRelations[];

    const estadoBadge: Record<string, string> = {
        DISPONIBLE: "bg-emerald-500/10 text-emerald-500",
        RESERVADA: "bg-amber-500/10 text-amber-500",
        VENDIDA: "bg-rose-500/10 text-rose-500",
        BLOQUEADA: "bg-slate-500/10 text-slate-500",
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            {["Unidad", "Tipo", "Etapa", "Manzana", "Precio", "Estado"].map((h) => (
                                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {unidades.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-5 py-3 text-sm font-semibold text-slate-700 dark:text-white">{u.numero}</td>
                                <td className="px-5 py-3 text-sm text-slate-500 capitalize">{u.tipo.toLowerCase()}</td>
                                <td className="px-5 py-3 text-sm text-slate-500">{u.manzana.etapa.nombre}</td>
                                <td className="px-5 py-3 text-sm text-slate-500">{u.manzana.nombre}</td>
                                <td className="px-5 py-3 text-sm font-semibold text-slate-700 dark:text-white">${u.precio?.toLocaleString()}</td>
                                <td className="px-5 py-3">
                                    <span className={cn("text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg", estadoBadge[u.estado])}>
                                        {u.estado}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
