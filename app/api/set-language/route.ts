import { NextResponse } from "next/server";
import { i18n } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/format";

export async function POST(request: Request) {
  // @security-waive: PUBLIC - Cookie-based preference
  try {
    const { locale } = await request.json();

    if (!isLocale(locale) || !i18n.locales.includes(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, locale });

    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to set language" }, { status: 500 });
  }
}
