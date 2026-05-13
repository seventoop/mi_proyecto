import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/lib/i18n/config";
import { formatCurrency as formatI18nCurrency, formatNumber, toIntlLocale } from "@/lib/i18n/format";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD", locale: Locale = "es"): string {
    return formatI18nCurrency(amount, locale, currency, "");
}

export function formatDate(date: Date | string, locale: Locale = "es"): string {
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(date));
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function formatArea(value: number | null | undefined, unit: string = "m²", locale: Locale = "es"): string {
    if (value == null || Number.isNaN(value)) return "—";

    const formatted = formatNumber(value, locale, 2);

    return `${formatted} ${unit}`;
}
