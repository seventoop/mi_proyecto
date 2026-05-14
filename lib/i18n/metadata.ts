import type { Metadata } from "next";
import type { Locale } from "./config";

const metadataByLocale = {
  es: {
    title: "SevenToop - Gestión Inmobiliaria Elite",
    description:
      "Plataforma integral de gestión inmobiliaria. Administración de desarrollos, unidades, leads y portafolio de inversión con trazabilidad forense.",
    openGraphDescription:
      "La plataforma definitiva para desarrolladores e inversores inmobiliarios.",
    ogLocale: "es_AR",
  },
  en: {
    title: "SevenToop - Elite Real Estate Management",
    description:
      "A complete real estate management platform for developments, units, leads, and investment portfolios with forensic traceability.",
    openGraphDescription:
      "The definitive platform for real estate developers and investors.",
    ogLocale: "en_US",
  },
} as const;

export function buildRootMetadata(locale: Locale, baseUrl: string): Metadata {
  const copy = metadataByLocale[locale];

  return {
    title: {
      default: copy.title,
      template: "%s | SevenToop",
    },
    description: copy.description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: "website",
      locale: copy.ogLocale,
      url: baseUrl,
      title: copy.title,
      description: copy.openGraphDescription,
      siteName: "SevenToop",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "SevenToop Dashboard",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
