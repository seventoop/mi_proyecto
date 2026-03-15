import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Términos y Condiciones | SevenToop",
    description: "Términos y condiciones de uso de la plataforma SevenToop.",
};

export default function TerminosPage() {
    return (
        <main className="min-h-screen pt-32 pb-24 bg-white dark:bg-[#1A1A2E]">
            <div className="max-w-3xl mx-auto px-6 text-center">
                <h1 className="text-4xl font-black text-foreground mb-8">Términos y condiciones</h1>
                <p className="text-lg text-foreground/70 mb-12">
                    Documento en elaboración. Para consultas escribinos a hola@seventoop.com
                </p>
            </div>
        </main>
    );
}
