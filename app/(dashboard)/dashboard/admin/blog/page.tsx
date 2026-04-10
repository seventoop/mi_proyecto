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
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

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
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminBlog} />
                </div>
                <button className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs uppercase font-black tracking-widest text-white transition-all shadow-lg shadow-brand-500/20">
                    <Plus className="w-4 h-4" /> Nuevo Post
                </button>
            </div>

            <div className="flex gap-2 bg-[#0A0A0C] border border-white/[0.06] p-1.5 rounded-xl w-fit">
                {["TODOS", "PENDIENTE", "APROBADO", "BORRADOR"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                            filter === f
                                ? "bg-white/[0.06] text-white"
                                : "text-slate-500 hover:text-white"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-64 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />)
                ) : filteredPosts.map((post) => (
                    <div key={post.id} className="bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl group flex flex-col h-full overflow-hidden transition-all shadow-sm">
                        {/* Image Placeholder or Actual */}
                        <div className="aspect-video bg-white/[0.02] relative overflow-hidden">
                            {post.imagen ? (
                                <Image
                                    src={post.imagen}
                                    alt={post.titulo}
                                    fill
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <FileText className="w-12 h-12 text-white/[0.06]" />
                                </div>
                            )}
                            <div className="absolute top-3 right-3">
                                <Badge className={cn(
                                    "text-xs font-black uppercase tracking-widest border-none px-2 py-0.5 rounded-md",
                                    post.status === "APROBADO" ? "bg-emerald-500/10 text-emerald-500" :
                                        post.status === "PENDIENTE" ? "bg-amber-500/10 text-amber-500" : "bg-slate-500/10 text-slate-400"
                                )}>
                                    {post.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="w-3 h-3 text-brand-500" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    {post.tags?.[0] || "General"}
                                </span>
                            </div>

                            <h3 className="text-[14px] font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-brand-500 transition-colors uppercase tracking-tight">
                                {post.titulo}
                            </h3>

                            <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 font-medium">
                                {post.contenido.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/[0.06]">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center">
                                        <User className="w-3 h-3 text-brand-500" />
                                    </div>
                                    <span className="text-xs font-black tracking-widest uppercase text-slate-400">
                                        {post.autor?.nombre}
                                    </span>
                                </div>

                                <div className="flex gap-1">
                                    {post.status === "PENDIENTE" && (
                                        <button
                                            onClick={() => handleStatusChange(post.id, "APROBADO")}
                                            className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button className="p-1.5 hover:bg-white/[0.06] text-slate-400 hover:text-white rounded-lg transition-colors">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
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
