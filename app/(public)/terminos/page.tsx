export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white py-20 px-6">
            <div className="max-w-3xl mx-auto space-y-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tight">Términos y Condiciones</h1>
                    <p className="text-slate-400">Última actualización: 24 de Febrero, 2026</p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-orange">1. Aceptación de los términos</h2>
                    <p className="text-slate-300 leading-relaxed">
                        Al acceder y utilizar la plataforma SevenToop, usted acepta quedar vinculado por estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá utilizar nuestros servicios.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-orange">2. Uso de la plataforma</h2>
                    <p className="text-slate-300 leading-relaxed">
                        SevenToop es una herramienta tecnológica para la gestión de desarrollos inmobiliarios. Usted se compromete a proporcionar información veraz y a mantener la confidencialidad de su cuenta.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-orange">3. Privacidad</h2>
                    <p className="text-slate-300 leading-relaxed">
                        El uso de sus datos personales se rige por nuestra Política de Privacidad, la cual se incorpora por referencia a estos términos.
                    </p>
                </section>

                <div className="pt-8 border-t border-white/10">
                    <p className="text-sm text-slate-500">
                        SevenToop — Gestión Inmobiliaria Inteligente.
                    </p>
                </div>
            </div>
        </div>
    );
}
