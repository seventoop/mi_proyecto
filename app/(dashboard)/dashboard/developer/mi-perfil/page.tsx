import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, User, Mail, Calendar, CheckCircle } from "lucide-react";
import prisma from "@/lib/db";
import { ProfileForm } from "@/components/dashboard/profile/profile-form";
import { cn } from "@/lib/utils";

export default async function DeveloperProfilePage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (userRole !== "VENDEDOR") {
        redirect("/dashboard");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            nombre: true,
            email: true,
            kycStatus: true,
            createdAt: true,
            apellido: true,
            telefono: true,
            direccion: true,
            apodo: true,
            avatar: true,
            bio: true,
        }
    });

    if (!user) {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Mi Perfil</h1>
                <p className="text-slate-400 mt-1">Gestiona tu información personal y verifica tu identidad</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Información Personal</h2>
                        <ProfileForm user={user} />
                    </div>
                </div>

                {/* KYC Status */}
                <div className="glass-card p-6 h-fit sticky top-6">
                    <h2 className="text-xl font-bold text-white mb-4">Verificación KYC</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Shield className={cn("w-8 h-8",
                                user.kycStatus === "VERIFICADO" ? "text-emerald-500" :
                                    user.kycStatus === "PENDIENTE" ? "text-amber-500" :
                                        "text-rose-500"
                            )} />
                            <div>
                                <p className="text-sm text-slate-400">Estado</p>
                                <p className={cn("font-semibold",
                                    user.kycStatus === "VERIFICADO" ? "text-emerald-400" :
                                        user.kycStatus === "PENDIENTE" ? "text-amber-400" :
                                            "text-rose-400"
                                )}>
                                    {user.kycStatus === "PENDIENTE" ? "Pendiente" : user.kycStatus}
                                </p>
                            </div>
                        </div>

                        {user.kycStatus !== "VERIFICADO" && (
                            <div className="pt-4 border-t border-slate-700">
                                <p className="text-sm text-slate-400 mb-3">
                                    Completa tu verificación para poder publicar proyectos y operar en la plataforma.
                                </p>
                                <Link
                                    href="/dashboard/developer/mi-perfil/kyc"
                                    className="block w-full py-2 text-center bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-brand-500/20"
                                >
                                    Completar KYC
                                </Link>
                            </div>
                        )}

                        {user.kycStatus === "VERIFICADO" && (
                            <div className="pt-4 border-t border-slate-700">
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <p className="text-xs text-emerald-400 flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3" />
                                        Identidad verificada
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
