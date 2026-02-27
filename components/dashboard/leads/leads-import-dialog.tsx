"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { bulkCreateLeads } from "@/lib/actions/leads";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadsImportDialogProps {
    children?: React.ReactNode;
}

export function LeadsImportDialog({ children }: LeadsImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [parsedData, setParsedData] = useState<any[] | null>(null);
    const [stats, setStats] = useState<{ count: number; errors: string[] } | null>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
            setParsedData(null);
        }
    };

    const handleParse = () => {
        if (!file) return;

        setIsLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data.map((row: any) => ({
                    nombre: row.nombre || row.Nombre || row.Name || row.name,
                    email: row.email || row.Email || row.correo,
                    telefono: row.telefono || row.Telefono || row.phone || row.Phone,
                    mensaje: row.mensaje || row.notas || row.Notes
                })).filter((row: any) => row.email); // Basic filter

                setParsedData(data);
                setIsLoading(false);

                if (data.length === 0) {
                    toast.error("No se encontraron filas validas. Verifica las columnas (nombre, email).");
                } else {
                    toast.success(`${data.length} filas detectadas correctamente.`);
                }
            },
            error: (error) => {
                console.error(error);
                toast.error("Error al leer el archivo CSV.");
                setIsLoading(false);
            }
        });
    };

    const handleImport = async () => {
        if (!parsedData) return;

        setIsLoading(true);
        const res = await bulkCreateLeads(parsedData);
        setIsLoading(false);

        if (res.success) {
            setStats({ count: res.count!, errors: res.errors! });
            toast.success(`Importación completada: ${res.count} leads credos.`);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const reset = () => {
        setFile(null);
        setParsedData(null);
        setStats(null);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) reset(); }}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" /> Importar CSV
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Importar Leads Masivamente</DialogTitle>
                    <DialogDescription>
                        Sube un archivo CSV con las columnas: <strong>nombre, email, telefono, notas</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!stats ? (
                        <>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="csvFile">Archivo CSV</Label>
                                <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
                            </div>

                            {file && !parsedData && (
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-lg flex items-center justify-between">
                                    <span className="text-sm font-medium">{file.name}</span>
                                    <Button size="sm" onClick={handleParse} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
                                        Analizar Archivo
                                    </Button>
                                </div>
                            )}

                            {parsedData && (
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                                            <CheckCircle className="w-5 h-5" />
                                            {parsedData.length} leads listos para importar
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Se crearán como "NUEVO" y se te asignarán automáticamente.
                                        </p>
                                    </div>
                                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                                        <pre className="text-xs">{JSON.stringify(parsedData.slice(0, 5), null, 2)}
                                            {parsedData.length > 5 && `\n... y ${parsedData.length - 5} más`}
                                        </pre>
                                    </ScrollArea>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl text-center">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">¡Importación Finalizada!</h3>
                                <p className="text-slate-500">Se han creado <strong>{stats.count}</strong> nuevos leads.</p>
                            </div>

                            {stats.errors.length > 0 && (
                                <div className="border border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/20 rounded-lg p-4">
                                    <h4 className="flex items-center font-semibold text-rose-600 dark:text-rose-400 mb-2">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        {stats.errors.length} errores detectados
                                    </h4>
                                    <ScrollArea className="h-[100px]">
                                        <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                                            {stats.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {stats ? (
                        <Button onClick={() => setOpen(false)}>Cerrar</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleImport} disabled={!parsedData || isLoading} className="bg-brand-500 hover:bg-brand-600 text-white">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Importar {parsedData ? `(${parsedData.length})` : ''}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
