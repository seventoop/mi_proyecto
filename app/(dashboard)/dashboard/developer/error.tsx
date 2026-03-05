"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DeveloperError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Developer Dashboard Error]", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
            <div className="p-4 bg-rose-500/10 rounded-2xl">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <div className="text-center space-y-2 max-w-md">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Error al cargar el dashboard
                </h2>
                <p className="text-sm text-slate-500 font-mono bg-slate-100 dark:bg-white/5 p-3 rounded-xl text-left break-all">
                    {error.message || "Error desconocido"}
                </p>
                {error.digest && (
                    <p className="text-xs text-slate-400">Digest: {error.digest}</p>
                )}
            </div>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reintentar
                </button>
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                >
                    Ir al inicio
                </Link>
            </div>
        </div>
    );
}
