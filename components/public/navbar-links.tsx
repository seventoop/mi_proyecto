"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    href: string;
}

export default function NavbarLinks({ items, mobile, onItemClick }: { items: NavItem[], mobile?: boolean, onItemClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const isHome = pathname === "/";

    const handleNavClick = useCallback(
        (e: React.MouseEvent, href: string) => {
            if (!href.startsWith("#")) return;

            e.preventDefault();
            const id = href.slice(1);

            if (isHome) {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            } else {
                router.push("/" + href);
            }

            if (onItemClick) onItemClick();
        },
        [isHome, router, onItemClick]
    );

    return (
        <div className={cn(mobile ? "flex flex-col gap-2" : "hidden md:flex items-center gap-1")}>
            {items.map((item) => {
                const isAnchor = item.href.startsWith("#");
                const isActive = isAnchor ? false : pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        href={isAnchor ? `/${item.href}` : item.href}
                        onClick={(e) => handleNavClick(e, item.href)}
                        className={cn(
                            mobile
                                ? "flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all"
                                : "px-4 py-2 rounded-xl text-sm font-semibold transition-all relative",
                            isActive
                                ? (mobile ? "bg-brand-orange text-white" : "text-brand-orange")
                                : (mobile ? "text-foreground/60 hover:bg-foreground/5 hover:text-brand-orange" : "text-foreground/60 hover:text-brand-orange hover:bg-foreground/5")
                        )}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}
