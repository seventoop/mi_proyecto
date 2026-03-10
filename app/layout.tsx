import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seventoop — Gestión Inmobiliaria",
  description:
    "Plataforma integral de gestión inmobiliaria para desarrollos, lotes, departamentos, leads y ventas.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
