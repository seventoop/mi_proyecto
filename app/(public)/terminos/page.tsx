import { Metadata } from "next";
import { getRequestDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
    const dictionary = await getRequestDictionary();

    return {
        title: dictionary.legalPages.terms.metadataTitle,
        description: dictionary.legalPages.terms.metadataDescription,
    };
}

export default async function TermsPage() {
    const dictionary = await getRequestDictionary();
    const copy = dictionary.legalPages;

    return (
        <div className="min-h-screen bg-slate-950 text-white py-20 px-6">
            <div className="max-w-3xl mx-auto space-y-10">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tight">{copy.terms.title}</h1>
                    <p className="text-slate-400">{copy.updatedAt}</p>
                </div>

                {copy.terms.sections.map((section) => (
                    <section key={section.title} className="space-y-4">
                        <h2 className="text-2xl font-bold text-brand-orange">{section.title}</h2>
                        <p className="text-slate-300 leading-relaxed">{section.body}</p>
                    </section>
                ))}

                <div className="pt-8 border-t border-white/10">
                    <p className="text-sm text-slate-500">{copy.terms.footer}</p>
                </div>
            </div>
        </div>
    );
}
