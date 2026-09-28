"use client";

import Link from "next/link";
import { useState } from "react";
import type { UserView } from "@/lib/types";

const ROLES = [
  {
    id: "farmer",
    title: "Livestock Owner",
    tint: "#c4622d",
    icon: "M4 20c1.5-6 4-9 8-9s6.5 3 8 9M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
    flow: ["My animals", "Digital twin", "Report issue", "Recommended action", "Track vet & lab"],
  },
  {
    id: "field",
    title: "Field Worker",
    tint: "#b8860b",
    icon: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
    flow: ["Assigned villages", "Register / select", "Mark twin", "Sync offline", "Forward to vet"],
  },
  {
    id: "vet",
    title: "Veterinarian",
    tint: "#1f8a7a",
    icon: "M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2M20 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
    flow: ["Case queue", "Twin + history", "Examine", "Treat / sample", "Follow-up"],
  },
  {
    id: "lab",
    title: "Laboratory",
    tint: "#4f5bd5",
    icon: "M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3",
    flow: ["Incoming samples", "Case context", "Record testing", "Publish result", "Twin updates"],
  },
  {
    id: "government",
    title: "Government Officer",
    tint: "#e6c27c",
    icon: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6",
    flow: ["Command center", "Risk map", "Clusters", "Response", "Advisories"],
  },
] as const;

type RoleId = (typeof ROLES)[number]["id"];

export default function EnterDesk({ users, initialRole }: { users: UserView[]; initialRole?: string }) {
  const [role, setRole] = useState<RoleId>((ROLES.find((r) => r.id === initialRole)?.id as RoleId) || "farmer");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const demo = users.find((u) => u.role === role);
  const [identifier, setIdentifier] = useState(demo?.phone || demo?.email || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const active = ROLES.find((r) => r.id === role)!;

  function pickRole(id: RoleId) {
    setRole(id);
    setError("");
    const u = users.find((x) => x.role === id);
    if (mode === "signin") {
      setIdentifier(u?.phone || u?.email || "");
      setPassword("");
    }
  }

  async function go(payload: Record<string, unknown>) {
    setPending(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      setError(data.error || "Could not sign in");
      return;
    }
    const check = await fetch("/api/auth", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ user: null }));
    if (check.user) {
      sessionStorage.removeItem("praana-session");
      window.location.assign(data.dest);
    } else {
      sessionStorage.setItem("praana-session", data.token);
      window.location.assign(`${data.dest}?as=${encodeURIComponent(data.token)}`);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signin") go({ mode: "signin", identifier, password, role });
    else go({ mode: "signup", name, farmName: role === "farmer" ? farmName : undefined, identifier, password, role });
  }

  return (
    <main className="signin" style={{ ["--tint" as string]: active.tint }}>
      <section className="signin-story">
        <Link href="/" className="brand" style={{ color: "white" }}>
          <span className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M6 22c2-7 5-10 10-10s8 3 10 10" stroke="#10241f" strokeWidth="1.8" strokeLinecap="round" /><circle cx="16" cy="12" r="1.7" fill="#10241f" /></svg>
          </span>
          <span><b>Praana</b><small>Livestock health intelligence</small></span>
        </Link>
        <div>
          <p className="kicker" style={{ color: "#e6c27c" }}>One animal · one twin · every role</p>
          <h1 className="serif">Sign in to your part of the network.</h1>
          <p className="signin-sub">Owners, field workers, veterinarians, laboratories and district officers each get their own desk — all writing to the same Digital Twin.</p>
        </div>
        <div className="signin-chain">
          {["Registration", "Digital Twin", "Health report", "Triage", "Vet review", "Laboratory", "Result", "Treatment", "Recovery"].map((s, i) => (
            <span key={s} style={{ animationDelay: `${i * 0.12}s` }}>{s}</span>
          ))}
        </div>
      </section>

      <section className="signin-panel">
        <p className="kicker">1 · Choose your role</p>
        <div className="role-grid-signin">
          {ROLES.map((r) => (
            <button key={r.id} type="button" className={`role-card ${role === r.id ? "on" : ""}`} style={{ ["--c" as string]: r.tint }} onClick={() => pickRole(r.id)}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={r.icon} /></svg>
              <b>{r.title}</b>
            </button>
          ))}
        </div>

        <div className="role-flow" key={role}>
          {active.flow.map((f, i) => (
            <span key={f}>
              <i>{i + 1}</i>
              {f}
            </span>
          ))}
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setError(""); setIdentifier(""); setPassword(""); }}>Create account</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <p className="kicker">2 · {mode === "signin" ? `Sign in as ${active.title}` : `Register as ${active.title}`}</p>
          {mode === "signup" && (
            <label className="field">Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunita Pawar" required /></label>
          )}
          {mode === "signup" && role === "farmer" && (
            <label className="field">Farm / Dairy shed name<input value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="e.g. Pawar Dairy Farm" required /></label>
          )}
          <label className="field">Phone number or email<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="+91 98xxx xxxxx or name@dept.gov.in" autoComplete="username" required /></label>
          <label className="field">
            Password
            <span className="pw">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signin" ? "Your password" : "At least 6 characters"} autoComplete={mode === "signin" ? "current-password" : "new-password"} required />
              <button type="button" onClick={() => setShow((v) => !v)}>{show ? "Hide" : "Show"}</button>
            </span>
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn-primary auth-submit" disabled={pending}>
            {pending ? "Opening your desk…" : mode === "signin" ? "Sign in" : "Create account & sign in"}
          </button>
          {mode === "signin" && demo && (
            <div className="demo-hint">
              <span>
                Demo account: <b>{demo.name}</b> · {demo.phone || demo.email} · password <b>praana123</b>
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn-line" onClick={() => { setIdentifier(demo.phone || demo.email || ""); setPassword("praana123"); }}>Fill</button>
                <button type="button" className="btn-line" disabled={pending} onClick={() => go({ mode: "demo", userId: demo.id })}>Quick enter</button>
              </div>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
