"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ProyectoForm from "@/components/dashboard/proyectos/proyecto-form";

// This page fetches the project client-side and shows the edit modal.
// On close it redirects back to the project detail.
export default function EditarProyectoPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [proyecto, setProyecto] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`/api/developments/${id}`)
            .then((r) => {
                if (!r.ok) throw new Error("No se pudo cargar el proyecto.");
                return r.json();
            })
            .then((data) => {
                // API returns the project object directly
                if (data?.id) {
                    setProyecto(data);
                } else {
                    setError("No se pudo cargar el proyecto.");
                }
            })
            .catch(() => setError("Error de conexión."))
            .finally(() => setLoading(false));
    }, [id]);

    const handleClose = () => {
        router.push(`/dashboard/proyectos/${id}`);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
                <div className="text-white text-sm font-medium animate-pulse">
                    Cargando proyecto...
                </div>
            </div>
        );
    }

    if (error || !proyecto) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center max-w-sm mx-4">
                    <p className="text-rose-500 font-semibold mb-4">
                        {error || "Proyecto no encontrado."}
                    </p>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold"
                    >
                        Volver al proyecto
                    </button>
                </div>
            </div>
        );
    }

    return <ProyectoForm proyecto={proyecto} onClose={handleClose} />;
}
