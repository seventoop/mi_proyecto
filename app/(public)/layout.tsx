import Navbar from "@/components/public/navbar";
import { Leaf, Facebook, Instagram, Youtube, Send, Music2 } from "lucide-react";
import Link from "next/link";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            {children}

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-white/5 bg-white dark:bg-black">
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="col-span-1 md:col-span-2 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-lg">
                                    <Leaf className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-foreground">
                                        Seven<span className="text-brand-600">toop</span>
                                    </span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-earth-600 dark:text-earth-400 -mt-0.5">
                                        Urbanismo Digital
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-foreground/50 max-w-sm leading-relaxed">
                                Plataforma integral de gestión inmobiliaria para desarrollos,
                                urbanizaciones y departamentos. Impulsada por datos reales.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">
                                Plataforma
                            </h4>
                            <ul className="space-y-3">
                                {["Proyectos", "Masterplan", "Tour 360°", "CRM"].map(
                                    (item) => (
                                        <li key={item}>
                                            <Link
                                                href="#"
                                                className="text-sm text-foreground/50 hover:text-brand-600 transition-colors"
                                            >
                                                {item}
                                            </Link>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">
                                Contacto
                            </h4>
                            <ul className="space-y-3">
                                {["Soporte", "Documentación", "API", "Estado del Servicio"].map(
                                    (item) => (
                                        <li key={item}>
                                            <Link
                                                href="#"
                                                className="text-sm text-foreground/50 hover:text-brand-600 transition-colors"
                                            >
                                                {item}
                                            </Link>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <span className="text-sm text-foreground/30">
                            © {new Date().getFullYear()} Seventoop. Todos los derechos reservados.
                        </span>
                        <div className="flex items-center gap-6">
                            {["Términos", "Privacidad", "Cookies"].map((item) => (
                                <Link
                                    key={item}
                                    href="#"
                                    className="text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
                                >
                                    {item}
                                </Link>
                            ))}
                        </div>


                        {/* Social Icons */}
                        <div className="flex items-center gap-4">
                            {[
                                { name: 'Facebook', icon: <Facebook className="w-5 h-5" />, href: 'https://facebook.com/seventoop' },
                                { name: 'Instagram', icon: <Instagram className="w-5 h-5" />, href: 'https://instagram.com/seventoop' },
                                { name: 'TikTok', icon: <Music2 className="w-5 h-5" />, href: 'https://tiktok.com/@seventoop' },
                                { name: 'YouTube', icon: <Youtube className="w-5 h-5" />, href: 'https://youtube.com/@seventoop' },
                                { name: 'Telegram', icon: <Send className="w-5 h-5" />, href: 'https://t.me/seventoop' }
                            ].map((social) => (
                                <Link
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 text-foreground/40 hover:text-brand-600 hover:bg-brand-600/10 hover:scale-110 active:scale-95 transition-all shadow-sm"
                                    title={social.name}
                                >
                                    {social.icon}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
