import type { Metadata } from "next";
import "./globals.css";

const baseUrl = process.env.NEXTAUTH_URL || "https://seventoop.com";

export const metadata: Metadata = {
  title: {
    default: "SevenToop — Gestión Inmobiliaria Elite",
    template: "%s | SevenToop"
  },
  description: "Plataforma integral de gestión inmobiliaria. Administración de desarrollos, unidades, leads y portafolio de inversión con trazabilidad forense.",
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: baseUrl,
    title: "SevenToop — Gestión Inmobiliaria Elite",
    description: "La plataforma definitiva para desarrolladores e inversores inmobiliarios.",
    siteName: "SevenToop",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SevenToop Dashboard"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "SevenToop — Gestión Inmobiliaria Elite",
    description: "Plataforma integral de gestión inmobiliaria.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  }
};

import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/components/providers/language-provider";
import { cookies } from "next/headers";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { i18n, type Locale } from "@/lib/i18n/config";
import Script from "next/script";
import { Toaster } from "sonner";

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
        </LanguageProvider>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
