"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InventarioTable from "./inventario-table";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Filter, X } from "lucide-react";

interface InventarioViewProps {
    data: any[];
}

export default function InventarioView({ data }: InventarioViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentStatus = searchParams.get("estado") || "all";

    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value && value !== "all") {
            params.set("estado", value);
        } else {
            params.delete("estado");
        }
        router.push(`/dashboard/developer/inventario?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-500/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventario Global</h1>
                        <p className="text-sm text-slate-500">
                            {data.length} unidades encontradas
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={currentStatus} onValueChange={handleFilterChange}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="DISPONIBLE">Disponibles</SelectItem>
                            <SelectItem value="RESERVADO">Reservadas</SelectItem>
                            <SelectItem value="VENDIDO">Vendidas</SelectItem>
                            <SelectItem value="BLOQUEADO">Bloqueadas</SelectItem>
                        </SelectContent>
                    </Select>

                    {currentStatus !== "all" && (
                        <Button variant="ghost" size="icon" onClick={() => handleFilterChange("all")} title="Limpiar filtros">
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            <InventarioTable data={data} />
        </div>
    );
}
