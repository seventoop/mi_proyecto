"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Unidad {
    id: string;
    numero: string;
    estado: string;
    precio: number;
    moneda: string;
    superficie: number;
    manzana: {
        etapa: {
            proyecto: {
                nombre: string;
            };
        };
    };
}

interface InventarioTableProps {
    data: Unidad[];
}

export default function InventarioTable({ data }: InventarioTableProps) {
    const router = useRouter();

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "DISPONIBLE":
                return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Disponible</Badge>;
            case "RESERVADO":
                return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Reservado</Badge>;
            case "VENDIDO":
                return <Badge className="bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 border-brand-500/20">Vendido</Badge>;
            case "BLOQUEADO":
                return <Badge variant="secondary">Bloqueado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center glass-card">
                <Building2 className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No hay unidades encontradas</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-2">
                    No se encontraron unidades con los filtros seleccionados.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-white/5">
                    <TableRow>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Superficie</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((unidad) => (
                        <TableRow key={unidad.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <TableCell className="font-medium text-slate-900 dark:text-white">
                                {unidad.manzana.etapa.proyecto.nombre}
                            </TableCell>
                            <TableCell>
                                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    {unidad.numero}
                                </span>
                            </TableCell>
                            <TableCell>
                                {formatCurrency(unidad.precio, unidad.moneda)}
                            </TableCell>
                            <TableCell>
                                {unidad.superficie} m²
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(unidad.estado)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/dashboard/proyectos/${"TODO-FIX-ID"}`}> {/* TODO: Need project ID here */}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
