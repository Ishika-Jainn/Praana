"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOffline } from "./providers";
import { withDesk } from "./shell/DeskBridge";

export function SubmitAction({
  type,
  payload,
  children,
  className,
  href,
}: {
  type: string;
  payload?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const router = useRouter();
  const offline = useOffline();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    if (offline.offline) {
      offline.enqueue({ kind: type, summary: String(children), payload: payload || {} });
      return;
    }
    setPending(true);
    setError("");
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    if (href || data.href) router.push(withDesk(href || data.href));
    router.refresh();
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button className={className || "btn-primary"} disabled={pending} onClick={run}>{pending ? "Saving…" : children}</button>
      {error && <span className="faint">{error}</span>}
    </span>
  );
}

export function FormAction({
  type,
  extra,
  children,
  label = "Save",
}: {
  type: string;
  extra?: Record<string, unknown>;
  children: React.ReactNode;
  label?: string;
}) {
  const router = useRouter();
  const offline = useOffline();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { ...extra };
    fd.forEach((value, key) => {
      payload[key] = value;
    });
    if (offline.offline) {
      offline.enqueue({ kind: type, summary: label, payload });
      setMessage("Saved on this device. Sync when the network returns.");
      return;
    }
    setPending(true);
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
    const data = await res.json();
    setPending(false);
    setMessage(res.ok ? data.message || "Saved" : data.error || "Could not save");
    if (res.ok) {
      if (data.href) router.push(withDesk(data.href));
      router.refresh();
    }
  }
  return (
    <form onSubmit={onSubmit} className="panel panel-pad" style={{ display: "grid", gap: 8 }}>
      {children}
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : label}</button>
      {message && <p className="muted">{message}</p>}
    </form>
  );
}
