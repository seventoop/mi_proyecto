"use client";

import { useState } from "react";
import ProyectoForm from "@/components/dashboard/proyectos/proyecto-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProyectoPage() {
    const [showForm, setShowForm] = useState(true);

    return (
        <div className="min-h-screen p-6">
            <Link href="/dashboard/admin/proyectos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" />
                Volver a Proyectos
            </Link>

            {showForm && (
                <ProyectoForm
                    onClose={() => window.location.href = "/dashboard/admin/proyectos"}
                    userRole="ADMIN"
                />
            )}
        </div>
    );
}
