import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seventoop — Gestión Inmobiliaria",
  description:
    "Plataforma integral de gestión inmobiliaria para desarrollos, lotes, departamentos, leads y ventas.",
};

import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/components/providers/language-provider";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { i18n, type Locale } from "@/lib/i18n/config";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;
  const locale = localeCookie && i18n.locales.includes(localeCookie) ? localeCookie : i18n.defaultLocale;
  
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <LanguageProvider initialLocale={locale} initialDictionary={dictionary}>
          <Providers>{children}</Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}
