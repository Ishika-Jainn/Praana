import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "./data";
import { readToken, ROLE_HOME } from "./auth";
import type { Lang, Role, UserView } from "./types";

export async function getSessionUser(): Promise<UserView | null> {
  const jar = await cookies();
  const fromCookie = readToken(jar.get("praana_session")?.value);
  const cookieLang = jar.get("praana_lang")?.value;
  const preferredLang: Lang | null =
    cookieLang === "hi" || cookieLang === "mr" || cookieLang === "en" ? (cookieLang as Lang) : null;

  if (fromCookie) {
    const u = await getUser(fromCookie);
    if (u) {
      return preferredLang ? { ...u, language: preferredLang } : u;
    }
  }
  const h = await headers();
  const fromHeader = readToken(h.get("x-praana-session"));
  if (fromHeader) {
    const u = await getUser(fromHeader);
    if (u) {
      return preferredLang ? { ...u, language: preferredLang } : u;
    }
  }
  return null;
}

/** Guards a page to the given roles; other roles are sent to their own home. */
export async function requireRole(roles: Role[]): Promise<UserView> {
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role] || "/enter");
  return user;
}
