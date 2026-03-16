import { Suspense } from "react";
import { getFlowById } from "@/lib/actions/logictoop";
import { LogicToopBuilder } from "../../builder-client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BuilderPageProps {
    params: {
        id: string;
    }
}

export default async function LogicToopBuilderPage({ params }: BuilderPageProps) {
    const result = await getFlowById(params.id);

    if (!result.success || !result.data) {
        return <div className="p-8 text-center uppercase font-black italic">Flow no encontrado</div>;
    }

    const flow = result.data;

    return (
        <div className="space-y-8 pb-12 px-4 md:px-0">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin/logictoop" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                        Builder: <span className="text-brand-500 underline decoration-2">{flow.nombre}</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        Editando flujo para {flow.org.nombre}
                    </p>
                </div>
            </div>

            <Suspense fallback={<div className="glass-card p-12 animate-pulse text-center uppercase font-black italic">Cargando Constructor...</div>}>
                <LogicToopBuilder flow={flow} />
            </Suspense>
        </div>
    );
}
