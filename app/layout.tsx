import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/components/providers/language-provider";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { i18n, type Locale } from "@/lib/i18n/config";
import { buildRootMetadata } from "@/lib/i18n/metadata";
import { resolveLocale } from "@/lib/i18n/format";
import Script from "next/script";

const baseUrl = process.env.NEXTAUTH_URL || "https://seventoop.com";

function getRequestLocale(): Locale {
  const locale = resolveLocale(cookies().get("NEXT_LOCALE")?.value);
  return i18n.locales.includes(locale) ? locale : i18n.defaultLocale;
}

export function generateMetadata(): Metadata {
  return buildRootMetadata(getRequestLocale(), baseUrl);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getRequestLocale();
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');
              `,
            }}
          />
        )}
        <LanguageProvider initialLocale={locale} initialDictionary={dictionary}>
          <Providers>{children}</Providers>
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              className: "!bg-zinc-900 !border-white/10 !text-white",
            }}
          />
        </LanguageProvider>
      </body>
    </html>
  );
}
