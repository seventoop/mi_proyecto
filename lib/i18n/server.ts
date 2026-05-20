import { cookies } from "next/headers";
import { getDictionary } from "./get-dictionary";
import { resolveLocale } from "./format";

export function getRequestLocale() {
  return resolveLocale(cookies().get("NEXT_LOCALE")?.value);
}

export async function getRequestDictionary() {
  return getDictionary(getRequestLocale());
}
