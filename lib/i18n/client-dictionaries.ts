import en from "./dictionaries/en.json";
import es from "./dictionaries/es.json";
import type { Locale } from "./config";

export const clientDictionaries = {
  es,
  en,
} as const;

export function getClientDictionary(locale: Locale) {
  return clientDictionaries[locale] ?? clientDictionaries.es;
}
