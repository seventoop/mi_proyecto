"use client";

import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { deleteUserAccount } from "@/lib/actions/user";
import { signOut } from "next-auth/react";
import { toast } from "sonner"; // Assuming sonner is used for toasts based on typical setup

export default function DeleteAccountSection() {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteUserAccount();
            if (res.success) {
                // Force logout and redirect to home
                await signOut({ callbackUrl: "/" });
            } else {
                toast.error(res.error || "Ocurrió un error al eliminar la cuenta");
                setIsDeleting(false);
            }
        } catch (error) {
            toast.error("Error de conexión al eliminar la cuenta");
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Zona de Peligro</h2>
            </div>

            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Una vez que elimines tu cuenta, no hay vuelta atrás. Se borrarán permanentemente todos tus datos personales, configuraciones y registros asociados.
                </p>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2 rounded-xl h-auto"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="w-5 h-5 mr-2" />
                            )}
                            Eliminar mi cuenta permanentemente
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white">
                                ¿Estás absolutamente seguro?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-medium">
                                Esta acción es irreversible. Se eliminará permanentemente tu cuenta y se borrarán todos tus datos de nuestros servidores.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl border-slate-200 dark:border-slate-800 dark:text-slate-400">
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                            >
                                Confirmar eliminación
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
