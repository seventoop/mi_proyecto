"use client";
import Link from 'next/link';
import Image from 'next/image';
import {
    Instagram,
    Twitter,
    Mail,
    MapPin,
    Facebook,
    Youtube,
    Send,
    Music2,
    MessageCircle, // WhatsApp Icon
    ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export default function Footer() {
    const { dictionary: t } = useLanguage();
    return (
        <footer className="bg-background text-foreground/70 border-t border-border pt-16 pb-8 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-orange/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-12">
                    {/* Brand Section */}
                    <div className="space-y-8">
                        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                            <Image
                                src="/logo-navbar.png"
                                alt="SevenToop"
                                width={260}
                                height={90}
                                className="object-contain"
                            />
                        </Link>
                    </div>

                    {/* Quick Access */}
                    <div>
                        <h4 className="text-foreground font-black text-base mb-4 tracking-tight">{t.footer.platform}</h4>
                        <ul className="space-y-3 text-sm font-semibold">
                            {[
                                { name: t.footer.links.home, href: "/#inicio" },
                                { name: t.footer.links.featured, href: "/#proyectos" },
                                { name: t.footer.links.howItWorks, href: "/#como-funciona" },
                                { name: t.footer.links.developers, href: "/#desarrolladores" },
                                { name: t.footer.links.blog, href: "/blog" }
                            ].map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="flex items-center group hover:text-brand-orange transition-colors">
                                        <span>{link.name}</span>
                                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact & Support */}
                    <div>
                        <h4 className="text-foreground font-black text-base mb-4 tracking-tight">{t.footer.contact}</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start">
                                <div className="space-y-1">
                                    <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{t.footer.contactLabels.email}</span>
                                    <a href="mailto:admin@seventoop.com" className="text-sm font-bold text-foreground hover:text-brand-orange transition-colors">
                                        admin@seventoop.com
                                    </a>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="space-y-1">
                                    <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{t.footer.contactLabels.whatsapp}</span>
                                    <a
                                        href="https://wa.me/541125777901"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold text-foreground hover:text-green-500 transition-colors"
                                    >
                                        +54 11 2577 7901
                                    </a>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <div className="space-y-1">
                                    <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{t.footer.contactLabels.offices}</span>
                                    <span className="text-sm font-bold text-foreground">{t.footer.location}</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="text-foreground font-black text-base mb-4 tracking-tight">{t.footer.legal}</h4>
                        <ul className="space-y-3 text-sm font-semibold">
                            <li><Link href="/legal/terminos" className="hover:text-brand-orange transition-colors">{t.footer.legalLinks.terms}</Link></li>
                            <li><Link href="/legal/privacidad" className="hover:text-brand-orange transition-colors">{t.footer.legalLinks.privacy}</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">
                        © {new Date().getFullYear()} <span className="text-foreground font-bold">SevenToop</span>. {t.footer.rights}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="h-4 w-px bg-border hidden md:block mr-2" />
                        {[
                            { icon: Facebook, label: "Facebook" },
                            { icon: Instagram, label: "Instagram" },
                            { icon: Music2, label: "TikTok" },
                            { icon: Youtube, label: "YouTube" },
                            { icon: Send, label: "Telegram" }
                        ].map((social, i) => (
                            <a
                                key={i}
                                href="#"
                                aria-label={social.label}
                                className="w-11 h-11 rounded-[1.25rem] bg-transparent border border-border/80 text-foreground flex items-center justify-center hover:bg-brand-orange hover:text-white hover:border-brand-orange hover:-translate-y-1 transition-all duration-300 shadow-sm"
                            >
                                <social.icon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
