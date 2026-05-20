import { Metadata } from "next";
import ContactoLanding from "@/components/public/contacto-landing";
import { getRequestDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
    const dictionary = await getRequestDictionary();

    return {
        title: dictionary.publicContact.title,
        description: dictionary.publicContact.description,
    };
}

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-white dark:bg-[#1A1A2E]">
            <ContactoLanding />
        </main>
    );
}
