"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { translate } from "@/lib/dictionary";
import type { Lang } from "@/lib/types";

type I18nValue = { lang: Lang; setLang: (lang: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key) => translate("en", key),
});

export function I18nProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return initial;
    const saved = localStorage.getItem("praana-lang") as Lang | null;
    if (saved === "en" || saved === "hi" || saved === "mr") return saved;
    return initial;
  });

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang: (next) => {
      setLangState(next);
      localStorage.setItem("praana-lang", next);
      document.cookie = `praana_lang=${next}; path=/; max-age=31536000`;
      router.refresh();
    },
    t: (key) => translate(lang, key),
  }), [lang, router]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export type QueueItem = {
  id: string;
  kind: string;
  summary: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

type OfflineValue = {
  simulated: boolean;
  online: boolean;
  offline: boolean;
  queue: QueueItem[];
  lastSync: string | null;
  syncing: boolean;
  toggle: () => void;
  enqueue: (item: Omit<QueueItem, "id" | "createdAt">) => void;
  syncNow: () => Promise<void>;
  toast: (text: string) => void;
};

const OfflineContext = createContext<OfflineValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [simulated, setSimulated] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("praana-offline") === "1";
  });
  const [online, setOnline] = useState(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  });
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("praana-queue") || "[]");
    } catch {
      return [];
    }
  });
  const [lastSync, setLastSync] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("praana-last-sync");
  });
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  function persist(next: QueueItem[]) {
    setQueue(next);
    localStorage.setItem("praana-queue", JSON.stringify(next));
  }

  function toast(text: string) {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  async function syncNow() {
    if (!queue.length) {
      toast("Nothing waiting to sync.");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sync_batch",
          items: queue.map((item) => ({ kind: item.kind, payload: item.payload })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      persist([]);
      const stamp = new Date().toISOString();
      localStorage.setItem("praana-last-sync", stamp);
      setLastSync(stamp);
      toast("Field queue synced to the network.");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const value: OfflineValue = {
    simulated,
    online,
    offline: simulated || !online,
    queue,
    lastSync,
    syncing,
    toggle: () => {
      const next = !simulated;
      setSimulated(next);
      localStorage.setItem("praana-offline", next ? "1" : "0");
      toast(next ? "Offline mode on. New reports stay on this device." : "Back online. You can sync the queue.");
    },
    enqueue: (item) => {
      persist([...queue, { ...item, id: `q-${Date.now()}`, createdAt: new Date().toISOString() }]);
      toast("Saved on device · sync pending");
    },
    syncNow,
    toast,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => <div className="toast" key={t.id}>{t.text}</div>)}
      </div>
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("Offline provider missing");
  return ctx;
}
