"use client";

import { useState, useEffect } from "react";
import {
    Plus, FileText, CheckCircle, Trash2, Edit3, Tag, User
} from "lucide-react";
import Image from "next/image";
import {
    getBlogPostsAdmin, updateBlogPost,
    deleteBlogPost
} from "@/lib/actions/blog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BlogPost {
    id: string;
    titulo: string;
    contenido: string;
    status: string;
    imagen?: string | null;
    tags?: string[];
    autor?: {
        nombre: string;
        email: string;
    } | null;
}

export default function AdminBlogPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("TODOS");

    const fetchPosts = async () => {
        setLoading(true);
        const res = await getBlogPostsAdmin();
        if (res.success) {
            setPosts(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleStatusChange = async (id: string, status: string) => {
        const res = await updateBlogPost(id, { status });
        if (res.success) {
            toast.success(`Post ${status.toLowerCase()}`);
            fetchPosts();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este post definitivamente?")) return;
        const res = await deleteBlogPost(id);
        if (res.success) {
            toast.success("Post eliminado");
            fetchPosts();
        }
    };

    const filteredPosts = filter === "TODOS"
        ? posts
        : posts.filter(p => p.status === filter);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                        Moderación <span className="text-brand-500 underline decoration-4">Blog</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        Control de Contenido y Noticias de la Plataforma
                    </p>
                </div>
                <Button className="bg-brand-600 hover:bg-brand-700 font-bold italic uppercase tracking-tighter">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Post
                </Button>
            </div>

            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit border border-white/10">
                {["TODOS", "PENDIENTE", "APROBADO", "BORRADOR"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            filter === f
                                ? "bg-white text-brand-600 shadow-xl"
                                : "text-slate-500 hover:text-white"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/10" />)
                ) : filteredPosts.map((post) => (
                    <div key={post.id} className="glass-card group flex flex-col h-full overflow-hidden border-white/10 hover:border-brand-500/30 transition-all">
                        {/* Image Placeholder or Actual */}
                        <div className="aspect-video bg-white/5 relative overflow-hidden">
                            {post.imagen ? (
                                <Image
                                    src={post.imagen}
                                    alt={post.titulo}
                                    fill
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FileText className="w-12 h-12 text-white/10" />
                                </div>
                            )}
                            <div className="absolute top-3 right-3">
                                <Badge className={cn(
                                    "text-[10px] font-black uppercase italic tracking-tighter border-none",
                                    post.status === "APROBADO" ? "bg-emerald-500 text-white" :
                                        post.status === "PENDIENTE" ? "bg-amber-500 text-black" : "bg-slate-500 text-white"
                                )}>
                                    {post.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="w-3 h-3 text-brand-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {post.tags?.[0] || "General"}
                                </span>
                            </div>

                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-brand-500 transition-colors uppercase italic tracking-tighter">
                                {post.titulo}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 font-medium italic">
                                {post.contenido.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                                        <User className="w-3 h-3 text-brand-500" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {post.autor?.nombre}
                                    </span>
                                </div>

                                <div className="flex gap-1">
                                    {post.status === "PENDIENTE" && (
                                        <button
                                            onClick={() => handleStatusChange(post.id, "APROBADO")}
                                            className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
