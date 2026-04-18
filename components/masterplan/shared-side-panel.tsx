"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SharedSidePanelProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    onClose: () => void;
    children: ReactNode;
    headerActions?: ReactNode;
    footer?: ReactNode;
    className?: string;
    bodyClassName?: string;
    tone?: "dark" | "light";
}

export default function SharedSidePanel({
    title,
    subtitle,
    icon,
    onClose,
    children,
    headerActions,
    footer,
    className,
    bodyClassName,
    tone = "dark",
}: SharedSidePanelProps) {
    const isDark = tone === "dark";

    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
                "absolute top-0 right-0 bottom-0 z-[1100] flex w-[360px] max-w-[calc(100vw-1rem)] flex-col border-l shadow-2xl",
                isDark
                    ? "bg-slate-950/95 border-slate-700/60 text-white backdrop-blur-xl"
                    : "bg-white/95 border-slate-200 text-slate-900 backdrop-blur-xl dark:bg-slate-900/95 dark:border-slate-700 dark:text-white",
                className,
            )}
        >
            <div
                className={cn(
                    "flex items-start justify-between gap-3 border-b px-4 py-3",
                    isDark ? "border-slate-700/60" : "border-slate-200 dark:border-slate-700",
                )}
            >
                <div className="flex min-w-0 items-center gap-3">
                    {icon}
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold">{title}</h3>
                        {subtitle ? (
                            <p className={cn("truncate text-[11px]", isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400")}>
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {headerActions}
                    <button
                        onClick={onClose}
                        className={cn(
                            "rounded-lg p-1.5 transition-colors",
                            isDark
                                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white",
                        )}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>

            {footer ? (
                <div
                    className={cn(
                        "border-t px-4 py-3",
                        isDark ? "border-slate-700/60" : "border-slate-200 dark:border-slate-700",
                    )}
                >
                    {footer}
                </div>
            ) : null}
        </motion.div>
    );
}
