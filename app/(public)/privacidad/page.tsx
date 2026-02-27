export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white py-20 px-6">
            <div className="max-w-3xl mx-auto space-y-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tight">Política de Privacidad</h1>
                    <p className="text-slate-400">Última actualización: 24 de Febrero, 2026</p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-orange">1. Información que recolectamos</h2>
                    <p className="text-slate-300 leading-relaxed">
                        Recolectamos información personal que usted nos proporciona voluntariamente, como nombre, email y datos de contacto, para brindarle acceso a la plataforma y mejorar nuestros servicios.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-orange">2. Uso de la información</h2>
                    <p className="text-slate-300 leading-relaxed">
                        Sus datos se utilizan exclusivamente para la gestión de su cuenta, comunicaciones relevantes sobre proyectos y optimización de la experiencia en SevenToop.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-orange">3. Seguridad</h2>
                    <p className="text-slate-300 leading-relaxed">
                        Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos personales contra acceso no autorizado, alteración o divulgación.
                    </p>
                </section>

                <div className="pt-8 border-t border-white/10">
                    <p className="text-sm text-slate-500">
                        SevenToop — Su privacidad es nuestra prioridad.
                    </p>
                </div>
            </div>
        </div>
    );
}
