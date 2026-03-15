import { Metadata } from "next";
import ContactoLanding from "@/components/public/contacto-landing";

export const metadata: Metadata = {
    title: "Contacto | SevenToop",
    description: "Contactate con SevenToop para dudas o sugerencias.",
};

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-white dark:bg-[#1A1A2E]">
            <ContactoLanding />
        </main>
    );
}
