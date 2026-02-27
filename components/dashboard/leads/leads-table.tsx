"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_COLORS: Record<string, string> = {
    "NUEVO": "bg-blue-500/20 text-blue-400",
    "CONTACTADO": "bg-amber-500/20 text-amber-400",
    "INTERESADO": "bg-purple-500/20 text-purple-400",
    "VISITA": "bg-pink-500/20 text-pink-400",
    "RESERVA": "bg-emerald-500/20 text-emerald-400",
    "PERDIDO": "bg-slate-500/20 text-slate-400",
};

export default function LeadsTable({ leads }: { leads: any[] }) {
    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-900/50">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asignado A</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.map((lead) => (
                        <TableRow key={lead.id} className="border-slate-800 hover:bg-slate-800/50">
                            <TableCell className="font-medium text-white">
                                {lead.nombre}
                            </TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    {lead.email && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Mail className="w-3 h-3" /> {lead.email}
                                        </div>
                                    )}
                                    {lead.telefono && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Phone className="w-3 h-3" /> {lead.telefono}
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                                {lead.proyecto?.nombre || "-"}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`border-0 ${STATUS_COLORS[lead.estado] || "bg-slate-700"}`}>
                                    {lead.estado}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {lead.asignadoA ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-6 h-6">
                                            <AvatarImage src={lead.asignadoA.avatar} />
                                            <AvatarFallback className="text-[10px]">{lead.asignadoA.nombre.substring(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-slate-400">{lead.asignadoA.nombre}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-500">Sin asignar</span>
                                )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-400">
                                {format(new Date(lead.createdAt), "dd MMM, yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                                        <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                                        <DropdownMenuItem>Editar</DropdownMenuItem>
                                        <DropdownMenuItem className="text-rose-400 hover:text-rose-300">Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    {leads.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                No se encontraron leads.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
