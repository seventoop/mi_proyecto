"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Search } from "lucide-react";
import { getLeads, createLead } from "@/lib/actions/leads";
import { createReserva } from "@/lib/actions/reservas";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ReservaModalProps {
    isOpen: boolean;
    onClose: () => void;
    unidad: {
        id: string;
        numero: string;
        precio: number | null;
        moneda: string;
    };
    onSuccess: () => void;
}

export default function ReservaModal({ isOpen, onClose, unidad, onSuccess }: ReservaModalProps) {
    const [step, setStep] = useState<"SEARCH_LEAD" | "DETAILS">("SEARCH_LEAD");
    const [searchTerm, setSearchTerm] = useState("");
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);

    // Reservation Details
    const [fechaVencimiento, setFechaVencimiento] = useState(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 7 days
    );
    const [montoSena, setMontoSena] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Lead Form
    const [showNewLead, setShowNewLead] = useState(false);
    const [newLeadName, setNewLeadName] = useState("");
    const [newLeadEmail, setNewLeadEmail] = useState("");
    const [newLeadPhone, setNewLeadPhone] = useState("");

    useEffect(() => {
        if (isOpen) {
            setStep("SEARCH_LEAD");
            setSearchTerm("");
            setSelectedLead(null);
            setShowNewLead(false);
            setMontoSena("");
            fetchLeads("");
        }
    }, [isOpen]);

    const fetchLeads = async (query: string) => {
        setIsLoadingLeads(true);
        const res = await getLeads({ search: query });
        if (res.success) {
            setLeads(res.data || []);
        }
        setIsLoadingLeads(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLeads(searchTerm);
    };

    const handleCreateLead = async () => {
        if (!newLeadName) return toast.error("El nombre es obligatorio");

        setIsSubmitting(true);
        const res = await createLead({
            nombre: newLeadName,
            email: newLeadEmail,
            telefono: newLeadPhone,
            origen: "RESERVA_RAPIDA"
        });
        setIsSubmitting(false);

        if (res.success) {
            setSelectedLead(res.data);
            setShowNewLead(false);
            setStep("DETAILS");
            toast.success("Lead creado correctamente");
        } else {
            toast.error("Error al crear lead");
        }
    };

    const handleSubmitReserva = async () => {
        if (!selectedLead) return;
        if (!fechaVencimiento) return toast.error("Fecha de vencimiento es obligatoria");

        setIsSubmitting(true);
        const res = await createReserva({
            unidadId: unidad.id,
            leadId: selectedLead.id,
            fechaVencimiento: new Date(fechaVencimiento),
            montoSena: montoSena ? parseFloat(montoSena) : undefined
        });
        setIsSubmitting(false);

        if (res.success) {
            toast.success("Reserva creada exitosamente");
            onSuccess();
            onClose();
        } else {
            toast.error(res.error || "Error al crear reserva");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Reservar Unidad {unidad.numero}</DialogTitle>
                </DialogHeader>

                {step === "SEARCH_LEAD" && (
                    <div className="space-y-4 py-4">
                        {!showNewLead ? (
                            <>
                                <form onSubmit={handleSearch} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar cliente por nombre o email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Button type="submit" disabled={isLoadingLeads}>
                                        {isLoadingLeads ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                                    </Button>
                                </form>

                                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
                                    {leads.length === 0 && !isLoadingLeads && (
                                        <p className="text-center text-sm text-muted-foreground py-4">No se encontraron clientes</p>
                                    )}
                                    {leads.map((lead) => (
                                        <div
                                            key={lead.id}
                                            onClick={() => {
                                                setSelectedLead(lead);
                                                setStep("DETAILS");
                                            }}
                                            className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">{lead.nombre}</p>
                                                <p className="text-xs text-muted-foreground">{lead.email}</p>
                                            </div>
                                            <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">Seleccionar</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 text-center">
                                    <Button variant="ghost" size="sm" onClick={() => setShowNewLead(true)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Crear Nuevo Cliente
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                                <div className="grid gap-2">
                                    <Label>Nombre Completo *</Label>
                                    <Input value={newLeadName} onChange={e => setNewLeadName(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Email</Label>
                                    <Input value={newLeadEmail} onChange={e => setNewLeadEmail(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Teléfono</Label>
                                    <Input value={newLeadPhone} onChange={e => setNewLeadPhone(e.target.value)} />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setShowNewLead(false)}>Cancelar</Button>
                                    <Button onClick={handleCreateLead} disabled={isSubmitting}>
                                        {isSubmitting ? "Creando..." : "Crear y Seleccionar"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === "DETAILS" && selectedLead && (
                    <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-slate-50 p-3 rounded-lg border flex justify-between items-center">
                            <div>
                                <p className="text-xs text-muted-foreground">Cliente seleccionado</p>
                                <p className="font-bold text-sm">{selectedLead.nombre}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setStep("SEARCH_LEAD")}>Cambiar</Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Precio Lista</Label>
                                <p className="font-mono text-sm font-bold mt-1">
                                    {unidad.precio ? formatCurrency(unidad.precio) : "—"}
                                </p>
                            </div>
                            <div>
                                <Label className="text-xs">Moneda</Label>
                                <p className="text-sm mt-1">{unidad.moneda}</p>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Monto Seña (Opcional)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={montoSena}
                                onChange={e => setMontoSena(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Fecha Vencimiento Reserva</Label>
                            <Input
                                type="date"
                                value={fechaVencimiento}
                                onChange={e => setFechaVencimiento(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">La reserva expirará automáticamente después de esta fecha.</p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === "DETAILS" && (
                        <>
                            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                            <Button onClick={handleSubmitReserva} disabled={isSubmitting} className="bg-brand-500 hover:bg-brand-600 text-white">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Reserva"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
