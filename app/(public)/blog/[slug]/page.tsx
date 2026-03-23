import { getNoticiaBySlug } from "@/lib/actions/noticias";
import { notFound } from "next/navigation";
import { Calendar, User, Tag, ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const res = await getNoticiaBySlug(slug);
    if (!res.success || !res.data) return { title: "Artículo no encontrado" };
    return {
        title: `${res.data.titulo} | Seventoop`,
        description: res.data.excerpt,
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const res = await getNoticiaBySlug(slug);
    if (!res.success || !res.data) notFound();

    const post = res.data;

    return (
        <main className="min-h-screen bg-slate-950 pt-24 pb-20">
            <article className="max-w-4xl mx-auto px-6">
                {/* Back Link */}
                <Link href="/blog" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-12 text-sm font-bold group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Volver al Blog
                </Link>

                {/* Header */}
                <header className="space-y-8 mb-12">
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-widest">
                            {post.categoria}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight">
                        {post.titulo}
                    </h1>

                    <p className="text-xl text-slate-400 font-medium leading-relaxed italic">
                        {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between border-y border-white/5 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-brand-500/20 overflow-hidden">
                                {post.autor?.avatar ? (
                                    <img src={post.autor.avatar} alt={post.autor.nombre} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-slate-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{post.autor?.nombre || "Gention Team"}</p>
                                <p className="text-xs text-slate-500">Autor</p>
                            </div>
                        </div>
                        <button className="p-3 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Featured Image */}
                <div className="aspect-[21/9] rounded-[3rem] overflow-hidden mb-16 border border-white/10 shadow-2xl">
                    <img
                        src={post.imagenUrl || "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop"}
                        alt={post.titulo}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-lg max-w-none prose-slate prose-headings:text-white prose-a:text-brand-400 prose-strong:text-brand-500 prose-img:rounded-3xl">
                    <div dangerouslySetInnerHTML={{ __html: post.contenido }} />
                </div>

                {/* Footer / Author Box */}
                <div className="mt-20 p-10 rounded-[3rem] bg-gradient-to-br from-slate-900 to-black border border-white/10 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[80px] rounded-full" />
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
                        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-brand-500/20 shrink-0 overflow-hidden">
                            {post.autor?.avatar ? (
                                <img src={post.autor.avatar} alt={post.autor.nombre} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-slate-500 mx-auto mt-6" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-xl font-bold text-white">{post.autor?.nombre || "Gention Team"}</h4>
                            <p className="text-slate-400 text-sm italic leading-relaxed">
                                {post.autor?.bio || "Expertos en desarrollo urbano y tecnología inmobiliaria dedicados a crear espacios vitales inteligentes."}
                            </p>
                        </div>
                    </div>
                </div>
            </article>
        </main>
    );
}
