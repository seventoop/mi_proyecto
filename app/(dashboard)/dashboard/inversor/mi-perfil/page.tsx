import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, User, Mail, Calendar, Wallet } from "lucide-react";
import prisma from "@/lib/db";

export default async function InvestorProfilePage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (userRole !== "INVERSOR") {
        redirect("/dashboard");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            nombre: true,
            email: true,
            kycStatus: true,
            createdAt: true,
        }
    });

    if (!user) {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-6 animate-fade-in p-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mi Perfil</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Información de tu cuenta de inversión</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Información Personal</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Nombre</p>
                                    <p className="text-slate-900 dark:text-white font-medium">{user.nombre}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                                    <p className="text-slate-900 dark:text-white font-medium">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Miembro desde</p>
                                    <p className="text-slate-900 dark:text-white font-medium">
                                        {new Date(user.createdAt).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KYC Status */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Verificación KYC</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Shield className={`w-8 h-8 ${user.kycStatus === "VERIFICADO" ? "text-emerald-500" :
                                user.kycStatus === "PENDIENTE" ? "text-amber-500" :
                                    "text-rose-500"
                                }`} />
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Estado</p>
                                <p className={`font-bold ${user.kycStatus === "VERIFICADO" ? "text-emerald-500" :
                                    user.kycStatus === "PENDIENTE" ? "text-amber-500" :
                                        "text-rose-500"
                                    }`}>
                                    {user.kycStatus}
                                </p>
                            </div>
                        </div>

                        {user.kycStatus !== "VERIFICADO" ? (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                    Completa tu verificación para poder realizar inversiones en la plataforma.
                                </p>
                                <Link
                                    href="/dashboard/inversor/mi-perfil/kyc"
                                    className="block w-full py-2.5 text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/20"
                                >
                                    Completar KYC
                                </Link>
                            </div>
                        ) : (
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg">
                                    <Wallet className="w-5 h-5" />
                                    <span className="text-xs font-bold">Habilitado para invertir</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
