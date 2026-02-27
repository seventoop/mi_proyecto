import { getNoticias } from "@/lib/actions/noticias";
import Link from "next/link";
import { BookOpen, Calendar, ArrowRight, Tag } from "lucide-react";
import MediaBanner from "@/components/public/media-banner";

export const metadata = {
    title: "Blog | Seventoop",
    description: "Noticias, tendencias y consejos sobre el sector inmobiliario y urbanismo digital.",
};

export default async function BlogPage() {
    const res = await getNoticias({ pageSize: 20 });
    const noticias = res.success ? res.data : [];

    return (
        <main className="min-h-screen bg-white dark:bg-black pt-24 pb-20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <BookOpen className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            Blog
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
                        Blog de <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">SevenToop</span>
                    </h1>
                    <p className="text-foreground/60 text-lg">
                        Novedades, tendencias del sector y contenido estratégico para desarrolladores inmobiliarios.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {noticias && noticias.length > 0 ? (
                        noticias.map((post: any) => (
                            <article key={post.id} className="group bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden hover:border-brand-orange/50 transition-all hover:shadow-2xl hover:shadow-brand-orange/10">
                                <Link href={`/blog/${post.slug}`} className="block relative h-64 overflow-hidden">
                                    <img
                                        src={post.imagenUrl || "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop"}
                                        alt={post.titulo}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-brand-orange/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                                        {post.categoria}
                                    </div>
                                </Link>
                                <div className="p-8">
                                    <div className="flex items-center gap-2 text-xs text-foreground/40 mb-4">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground mb-4 line-clamp-2 group-hover:text-brand-orange transition-colors leading-tight">
                                        <Link href={`/blog/${post.slug}`}>{post.titulo}</Link>
                                    </h2>
                                    <p className="text-foreground/60 text-sm mb-6 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <Link
                                        href={`/blog/${post.slug}`}
                                        className="inline-flex items-center gap-2 text-sm font-bold text-brand-orange hover:gap-3 transition-all"
                                    >
                                        Leer más <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 text-foreground/40">
                            Próximamente estaremos compartiendo nuestras primeras noticias.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
