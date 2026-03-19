import { Building2 } from "lucide-react";

export default function EmptyOrgState({ moduleName }: { moduleName: string }) {
    return (
        <div className="h-[calc(100vh-100px)] p-6 animate-fade-in flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                    Organización no asignada
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                    Para acceder al módulo de <strong>{moduleName}</strong>, necesitas pertenecer a una organización activa en la plataforma. 
                </p>
                <div className="mt-8 px-4 py-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                        Tu usuario actual no tiene un espacio de trabajo vinculado. Si crees que esto es un error, contacta a tu administrador o a soporte.
                    </p>
                </div>
            </div>
        </div>
    );
}
