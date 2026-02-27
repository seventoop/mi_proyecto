"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { createReserva } from "@/lib/actions/reservas"; // Need to export this correctly or use invoke
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

// Schema
const formSchema = z.object({
    leadId: z.string().min(1, "Selecciona un cliente"),
    unidadId: z.string().min(1, "Selecciona una unidad"),
    montoSena: z.string().min(1, "Ingresa el monto de seña"),
    fechaVencimiento: z.date({ message: "Selecciona fecha de vencimiento" }),
});

interface ReservaDialogProps {
    leads: any[];
    unidades: any[]; // Expecting available units
}

export default function ReservaDialog({ leads, unidades }: ReservaDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUnitPrice, setSelectedUnitPrice] = useState<number | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            montoSena: "",
        },
    });

    // Auto-calculate 10% sena when unit changes
    const watchUnidadId = form.watch("unidadId");
    useEffect(() => {
        if (watchUnidadId) {
            const unit = unidades.find((u) => u.id === watchUnidadId);
            if (unit) {
                setSelectedUnitPrice(unit.precio);
                form.setValue("montoSena", (unit.precio * 0.10).toFixed(2));
            }
        }
    }, [watchUnidadId, unidades, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const res = await createReserva({
                ...values,
                fechaVencimiento: values.fechaVencimiento.toISOString(),
            });

            if (res.success) {
                toast.success("Reserva creada correctamente");
                setOpen(false);
                form.reset();
            } else {
                toast.error(res.error || "Error al crear reserva");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                    Nueva Reserva
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nueva Reserva Manual</DialogTitle>
                    <DialogDescription>
                        Crea una reserva para un cliente existente. La unidad debe estar DISPONIBLE.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Lead Selection */}
                        <FormField
                            control={form.control}
                            name="leadId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Cliente / Lead</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? leads.find(lead => lead.id === field.value)?.nombre
                                                        : "Seleccionar cliente"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar cliente..." />
                                                <CommandEmpty>No encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {leads.map((lead) => (
                                                        <CommandItem
                                                            value={lead.nombre}
                                                            key={lead.id}
                                                            onSelect={() => {
                                                                form.setValue("leadId", lead.id);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    lead.id === field.value ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span>{lead.nombre}</span>
                                                                <span className="text-xs text-muted-foreground">{lead.email}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Unit Selection */}
                        <FormField
                            control={form.control}
                            name="unidadId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unidad Disponible</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar unidad" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {unidades.length === 0 ? (
                                                <SelectItem value="none" disabled>No hay unidades disponibles</SelectItem>
                                            ) : (
                                                unidades.map((unidad) => (
                                                    <SelectItem key={unidad.id} value={unidad.id}>
                                                        {unidad.manzana.etapa.proyecto.nombre} - Unidad {unidad.numero} ({formatCurrency(unidad.precio)})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Monto Seña */}
                        <FormField
                            control={form.control}
                            name="montoSena"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto de Seña (Sugerido 10%)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                                            <Input placeholder="0.00" {...field} className="pl-7" />
                                        </div>
                                    </FormControl>
                                    {selectedUnitPrice && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Valor Total: {formatCurrency(selectedUnitPrice)}
                                        </p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Fecha Vencimiento */}
                        <FormField
                            control={form.control}
                            name="fechaVencimiento"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Vencimiento de Reserva</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Seleccionar fecha</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="bg-brand-500 hover:bg-brand-600">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    "Confirmar Reserva"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
