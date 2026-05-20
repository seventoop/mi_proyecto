import { Metadata } from "next";
import { getRequestDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
    const dictionary = await getRequestDictionary();

    return {
        title: dictionary.legalPages.terms.metadataTitle,
        description: dictionary.legalPages.terms.metadataDescription,
    };
}

export default async function TerminosPage() {
    const dictionary = await getRequestDictionary();
    const copy = dictionary.legalPages;

    return (
        <main className="min-h-screen pt-32 pb-24 bg-white dark:bg-[#1A1A2E]">
            <div className="max-w-3xl mx-auto px-6 text-center">
                <h1 className="text-4xl font-black text-foreground mb-8">{copy.terms.title}</h1>
                <p className="text-lg text-foreground/70 mb-12">
                    {copy.draft}
                </p>
            </div>
        </main>
    );
}
