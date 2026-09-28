"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bell,
  Box,
  Camera,
  ChartNoAxesCombined,
  CloudSun,
  FlaskConical,
  HeartPulse,
  House,
  Landmark,
  LogOut,
  Map,
  Menu,
  Network,
  Plus,
  Radar,
  Search,
  Siren,
  Stethoscope,
  Syringe,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import type { AlertView, AnimalView, Lang, UserView } from "@/lib/types";
import { I18nProvider, OfflineProvider, useI18n, useOffline } from "../providers";
import { formatWhen } from "@/lib/format";
import DeskBridge from "./DeskBridge";
import VoiceCaptionBar from "../VoiceCaptionBar";

const ICONS = {
  house: House,
  animals: HeartPulse,
  report: Camera,
  vax: Syringe,
  treat: Stethoscope,
  alerts: Bell,
  offline: WifiOff,
  field: Map,
  register: Plus,
  cases: Landmark,
  map: Map,
  clinic: Stethoscope,
  command: Radar,
  territory: Network,
  analytics: ChartNoAxesCombined,
  herds: Users,
  climate: CloudSun,
  labs: FlaskConical,
  mortality: Siren,
  story: Network,
  twins: Box,
};

type Item = { href: string; key: string; icon: keyof typeof ICONS };

const NAV: Record<string, Item[]> = {
  farmer: [
    { href: "/console/farmer", key: "nav.home", icon: "house" },
    { href: "/console/animals", key: "nav.myAnimals", icon: "animals" },
    { href: "/console/register", key: "nav.register", icon: "register" },
    { href: "/console/twins", key: "nav.twins", icon: "twins" },
    { href: "/console/report", key: "nav.report", icon: "report" },
    { href: "/console/cases", key: "nav.cases", icon: "cases" },
    { href: "/console/vaccinations", key: "nav.vaccinations", icon: "vax" },
    { href: "/console/treatments", key: "nav.treatments", icon: "treat" },
    { href: "/console/alerts", key: "nav.alerts", icon: "alerts" },
    { href: "/console/sync", key: "nav.offline", icon: "offline" },
  ],
  field: [
    { href: "/console/field", key: "nav.field", icon: "field" },
    { href: "/console/twins", key: "nav.twins", icon: "twins" },
    { href: "/console/report", key: "nav.report", icon: "report" },
    { href: "/console/register", key: "nav.register", icon: "register" },
    { href: "/console/vaccinations", key: "nav.vaccinations", icon: "vax" },
    { href: "/console/cases", key: "nav.cases", icon: "cases" },
    { href: "/console/animals", key: "nav.animals", icon: "animals" },
    { href: "/console/map", key: "nav.map", icon: "map" },
    { href: "/console/sync", key: "nav.offline", icon: "offline" },
  ],
  vet: [
    { href: "/console/vet", key: "nav.clinic", icon: "clinic" },
    { href: "/console/twins", key: "nav.twins", icon: "twins" },
    { href: "/console/cases", key: "nav.cases", icon: "cases" },
    { href: "/console/animals", key: "nav.animals", icon: "animals" },
    { href: "/console/map", key: "nav.map", icon: "map" },
    { href: "/console/lab", key: "nav.labs", icon: "labs" },
    { href: "/console/vaccinations", key: "nav.vaccinations", icon: "vax" },
    { href: "/console/alerts", key: "nav.alerts", icon: "alerts" },
  ],
  lab: [
    { href: "/console/lab", key: "nav.labs", icon: "labs" },
    { href: "/console/cases", key: "nav.cases", icon: "cases" },
    { href: "/console/animals", key: "nav.animals", icon: "animals" },
    { href: "/console/alerts", key: "nav.alerts", icon: "alerts" },
  ],
  government: [
    { href: "/console/command", key: "nav.command", icon: "command" },
    { href: "/console/twins", key: "nav.twins", icon: "twins" },
    { href: "/console/map", key: "nav.map", icon: "map" },
    { href: "/console/hierarchy", key: "nav.territory", icon: "territory" },
    { href: "/console/analytics", key: "nav.analytics", icon: "analytics" },
    { href: "/console/cases", key: "nav.cases", icon: "cases" },
    { href: "/console/herd", key: "nav.herds", icon: "herds" },
    { href: "/console/alerts", key: "nav.alerts", icon: "alerts" },
    { href: "/console/weather", key: "nav.climate", icon: "climate" },
    { href: "/console/lab", key: "nav.labs", icon: "labs" },
    { href: "/console/mortality", key: "nav.mortality", icon: "mortality" },
    { href: "/console/story", key: "nav.story", icon: "story" },
  ],
};

function Frame({
  user,
  alerts,
  animals,
  children,
}: {
  user: UserView;
  alerts: AlertView[];
  animals: AnimalView[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const offline = useOffline();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [bell, setBell] = useState(false);
  const items = NAV[user.role] || NAV.government;
  const night = path.startsWith("/console/command");
  const unread = alerts.filter((a) => !a.readBy.includes(user.id)).length;
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 1) return [];
    return animals
      .filter((a) => `${a.name} ${a.id} ${a.villageName} ${a.breed} ${a.suspectedCondition || ""}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [q, animals]);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    sessionStorage.removeItem("praana-session");
    window.location.assign("/enter");
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M6 22c2-7 5-10 10-10s8 3 10 10" stroke="#10241f" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="16" cy="12" r="1.7" fill="#10241f" />
            </svg>
          </span>
          <span>
            <b>Praana</b>
            <small>{t("brandSub")}</small>
          </span>
        </Link>
        <nav className="side-nav">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = path === item.href || (item.href !== "/console/farmer" && path.startsWith(item.href) && item.href !== "/console");
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                <Icon size={16} />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="side-user">
          <strong>{user.name}</strong>
          <span>{user.title}</span>
          <button className="ghost-btn" onClick={logout}><LogOut size={14} /> Sign out</button>
        </div>
      </aside>
      <div className="workspace" data-theme={night ? "night" : "day"}>
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} />
            {results.length > 0 && (
              <div className="search-pop">
                {results.map((a) => (
                  <Link key={a.id} href={`/console/animals/${a.id}`} onClick={() => setQ("")}>
                    <strong>{a.name}</strong>
                    <div className="faint">{a.id} · {a.villageName} · {a.status}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button className={`sync-pill ${offline.offline || offline.queue.length ? "warn" : ""}`} onClick={offline.toggle}>
            {offline.offline || offline.queue.length ? t("common.pending") : t("common.synced")}
            {offline.queue.length ? ` · ${offline.queue.length}` : ""}
          </button>
          <div className="lang-switch">
            {(["en", "hi", "mr"] as Lang[]).map((code) => (
              <button key={code} className={lang === code ? "on" : ""} onClick={() => setLang(code)}>{code.toUpperCase()}</button>
            ))}
          </div>
          <button className="icon-btn" onClick={() => setBell((v) => !v)} aria-label="Alerts">
            <Bell size={16} />
            {unread > 0 && <i className="badge-dot" />}
          </button>
          {bell && (
            <div className="search-pop" style={{ position: "absolute", right: 22, top: 64, width: 340 }}>
              {alerts.slice(0, 5).map((a) => (
                <Link key={a.id} href={a.animalId ? `/console/animals/${a.animalId}` : "/console/alerts"} onClick={() => setBell(false)}>
                  <strong>{a.title}</strong>
                  <div className="faint">{formatWhen(a.createdAt)}</div>
                </Link>
              ))}
              <Link href="/console/alerts">All alerts</Link>
            </div>
          )}
        </header>
        <main className="main-scroll">{children}</main>
      </div>
      <nav className="tabbar">
        {items.slice(0, 5).map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <Link key={item.href} href={item.href} className={path === item.href ? "active" : ""}>
              <Icon size={16} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppShell(props: {
  user: UserView;
  alerts: AlertView[];
  animals: AnimalView[];
  children: React.ReactNode;
}) {
  return (
    <I18nProvider initial={props.user.language}>
      <DeskBridge />
      <OfflineProvider>
        <Frame {...props} />
        <VoiceCaptionBar />
      </OfflineProvider>
    </I18nProvider>
  );
}
