import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Política de Privacidad | SevenToop",
    description: "Política de privacidad y protección de datos de SevenToop.",
};

export default function PrivacidadPage() {
    return (
        <main className="min-h-screen pt-32 pb-24 bg-white dark:bg-[#1A1A2E]">
            <div className="max-w-3xl mx-auto px-6 text-center">
                <h1 className="text-4xl font-black text-foreground mb-8">Política de privacidad</h1>
                <p className="text-lg text-foreground/70 mb-12">
                    Documento en elaboración. Para consultas escribinos a hola@seventoop.com
                </p>
            </div>
        </main>
    );
}
