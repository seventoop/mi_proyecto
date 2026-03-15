"use client";

import React, { createContext, useContext, useState } from "react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

interface LanguageContextType {
  locale: Locale;
  dictionary: Dictionary;
  setLanguage: (locale: Locale) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
  initialLocale,
  initialDictionary,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialDictionary: Dictionary;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary] = useState<Dictionary>(initialDictionary);

  const setLanguage = async (newLocale: Locale) => {
    try {
      setLocaleState(newLocale);

      const res = await fetch("/api/set-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });

      if (res.ok) {
        // Recargar la página asegura que todos los Server Components
        // (como layout, page, meta) se vuelvan a generar con el nuevo idioma.
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to set language", error);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, dictionary, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
