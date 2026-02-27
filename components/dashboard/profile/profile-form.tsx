"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, User, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/ui/file-uploader";

const profileSchema = z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    apellido: z.string().optional(),
    apodo: z.string().optional(),
    telefono: z.string().optional(),
    direccion: z.string().optional(),
    bio: z.string().max(500, "La biografía no puede exceder los 500 caracteres").optional(),
    avatar: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    user: any;
}

export function ProfileForm({ user }: ProfileFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            nombre: user.nombre || "",
            apellido: user.apellido || "",
            apodo: user.apodo || "",
            telefono: user.telefono || "",
            direccion: user.direccion || "",
            bio: user.bio || "",
            avatar: user.avatar || "",
        },
    });

    async function onSubmit(data: ProfileFormValues) {
        setIsLoading(true);
        try {
            const res = await updateProfile(user.id, data);
            if (res.success) {
                toast.success("Perfil actualizado correctamente");
                router.refresh();
            } else {
                toast.error("Error al actualizar el perfil");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Avatar Section */}
                <div className="flex flex-col items-center sm:flex-row gap-6 p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700">
                            {form.watch("avatar") ? (
                                <img src={form.watch("avatar")} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-10 h-10 text-slate-500" />
                                </div>
                            )}
                        </div>
                        <FileUploader
                            onUploadComplete={(url) => form.setValue("avatar", url)}
                            variant="icon"
                            className="absolute bottom-0 right-0 bg-brand-500 hover:bg-brand-600 p-2 rounded-full text-white shadow-lg cursor-pointer transition-transform hover:scale-110"
                        >
                            <Camera className="w-4 h-4" />
                        </FileUploader>
                    </div>
                    <div className="text-center sm:text-left">
                        <h3 className="text-lg font-semibold text-white">Foto de Perfil</h3>
                        <p className="text-sm text-slate-400">Sube una imagen para personalizar tu perfil.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tu nombre" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="apellido"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Apellido</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tu apellido" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="apodo"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Apodo (Como te verán otros)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Pepe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="telefono"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl>
                                    <Input placeholder="+54 9 11..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="direccion"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Dirección</FormLabel>
                                <FormControl>
                                    <Input placeholder="Calle 123, Ciudad..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Biografía</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Cuéntanos un poco sobre vos..."
                                        className="resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Breve descripción para tu perfil público.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading} className="bg-brand-500 hover:bg-brand-600">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </div>
            </form>
        </Form>
    );
}
