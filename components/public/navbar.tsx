import Link from "next/link";
import Image from 'next/image';
import NavbarLinks from "./navbar-links";
import NavbarActions from "./navbar-actions";

const navItems = [
    { label: "Inicio", href: "#inicio" },
    { label: "Quiénes Somos", href: "#quienes" },
    { label: "Testimonios", href: "#testimonios" },
    { label: "Contacto", href: "#contacto" },
    { label: "Proyectos", href: "/proyectos" },
    { label: "Desarrolladores", href: "/desarrolladores" },
    { label: "Blog", href: "/blog" },
];

export default function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#111116]/95 backdrop-blur-md border-b border-slate-200 dark:border-brand-orange/20 shadow-sm dark:shadow-lg">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo (Server) */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <Image
                            src="/logo.png"
                            alt="SevenToop"
                            width={140}
                            height={40}
                            className="object-contain w-[100px] md:w-[140px]"
                            priority
                        />
                    </Link>

                    {/* Desktop Navigation (Client wrapper for smooth scroll logic) */}
                    <NavbarLinks items={navItems} />

                    {/* Action Icons & Mobile Menu (Client) */}
                    <NavbarActions items={navItems} />
                </div>
            </div>
        </header>
    );
}
