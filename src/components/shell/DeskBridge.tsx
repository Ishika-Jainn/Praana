"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export const SESSION_KEY = "praana-session";

export function withDesk(href: string) {
  if (typeof window === "undefined") return href;
  const token = sessionStorage.getItem(SESSION_KEY);
  if (!token || !href.startsWith("/") || href.includes("as=")) return href;
  return href + (href.includes("?") ? "&" : "?") + "as=" + encodeURIComponent(token);
}

/**
 * Cookie-less session fallback for embedded previews. Remembers the signed token
 * from `?as=`, sends it on same-origin requests, and keeps it on in-app links.
 */
export default function DeskBridge() {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    const as = new URL(window.location.href).searchParams.get("as");
    if (as) sessionStorage.setItem(SESSION_KEY, as);
  }, [path]);

  useEffect(() => {
    const w = window as Window & { __praanaFetch?: boolean };
    if (w.__praanaFetch) return;
    w.__praanaFetch = true;
    const orig = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const token = sessionStorage.getItem(SESSION_KEY);
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const same = url.startsWith("/") || url.startsWith(window.location.origin);
      if (token && same) {
        const h = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        h.set("x-praana-session", token);
        return orig(input, { ...init, headers: h });
      }
      return orig(input, init);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/console") || a.target === "_blank") return;
      if (!sessionStorage.getItem(SESSION_KEY) || href.includes("as=")) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(withDesk(href));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
