import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en.json";
import es from "@/lib/i18n/dictionaries/es.json";
import {
  formatCurrency,
  formatMessage,
  formatNumber,
  isLocale,
  resolveLocale,
} from "@/lib/i18n/format";

function keys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) {
    return obj.flatMap((value, index) => keys(value, `${prefix}[${index}]`));
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([key, value]) =>
      keys(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function emptyKeys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) {
    return obj.flatMap((value, index) => emptyKeys(value, `${prefix}[${index}]`));
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([key, value]) =>
      emptyKeys(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return typeof obj === "string" && obj.trim() === "" ? [prefix] : [];
}

describe("i18n dictionaries", () => {
  it("en and es expose the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });

  it("does not contain empty strings", () => {
    expect(emptyKeys(es)).toEqual([]);
    expect(emptyKeys(en)).toEqual([]);
  });

  it("interpolates dynamic message values", () => {
    expect(formatMessage("Captured {{time}} by {{user}}", { time: "today", user: "Ana" })).toBe(
      "Captured today by Ana",
    );
  });

  it("validates and resolves supported locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);

    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("fr")).toBe("es");
  });

  it("formats numbers and currency with locale-aware helpers", () => {
    expect(formatCurrency(1234, "en", "USD")).toBe("$1,234");
    expect(formatCurrency(null, "en", "USD")).toBe("Ask");
    expect(formatCurrency(undefined, "es", "USD")).toBe("Consultar");

    expect(formatNumber(1234.56, "en")).toBe("1,234.56");
    expect(formatNumber(1234.56, "es")).toBe("1.234,56");
  });
});
