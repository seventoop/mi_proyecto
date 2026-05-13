import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en.json";
import es from "@/lib/i18n/dictionaries/es.json";
import { formatMessage } from "@/lib/i18n/format";

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
});
