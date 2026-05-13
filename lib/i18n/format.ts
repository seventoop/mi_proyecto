import { enUS, es as esLocale } from "date-fns/locale";
import type { Locale } from "./config";

export const dateFnsLocales = {
  es: esLocale,
  en: enUS,
} as const;

export function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : "es";
}

export function toIntlLocale(locale: Locale) {
  return locale === "es" ? "es-AR" : "en-US";
}

export function formatMessage(
  template: string,
  values: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ""));
}

export function formatCurrency(
  value: number | null | undefined,
  locale: Locale,
  currency = "USD",
  fallback = locale === "es" ? "Consultar" : "Ask",
) {
  if (value == null || !Number.isFinite(value)) return fallback;

  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}
