"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardContainer({
    children,
}: {
    children: React.ReactNode;
}) {
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);

    return (
        <div
            className={cn(
                "transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-screen",
                sidebarOpen ? "lg:ml-64" : "lg:ml-20"
            )}
        >
            {children}
        </div>
    );
}
