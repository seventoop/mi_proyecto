import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

export default function DemoExpiredPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-rose-500" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">
                        Demo Expirado
                    </h1>
                    <p className="text-slate-400 font-medium leading-relaxed">
                        Tu período de demo ha expirado. Completa tu verificación KYC para
                        continuar usando la plataforma y mantener acceso a tus proyectos.
                    </p>
                </div>

                <Link
                    href="/onboarding/kyc"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-black uppercase tracking-wider transition-colors shadow-[0_8px_16px_rgba(245,158,11,0.2)]"
                >
                    Completar KYC ahora
                    <ArrowRight className="w-4 h-4" />
                </Link>

                <p className="text-xs text-slate-600">
                    ¿Necesitas ayuda?{" "}
                    <a href="mailto:soporte@seventoop.com" className="text-brand-500 hover:underline">
                        Contáctanos
                    </a>
                </p>
            </div>
        </div>
    );
}
