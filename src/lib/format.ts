export function iso(d: Date | string | null | undefined) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function daysAgo(n: number, hours = 8) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hours, (n * 17) % 60, 0, 0);
  return d;
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 2) return "Just now";
  if (mins >= 0 && mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (mins >= 0 && hrs < 24) return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  const days = Math.round(hrs / 24);
  if (mins >= 0 && days < 21) return days === 1 ? "Yesterday" : `${days} days ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" })
    .format(new Date(value))
    .toUpperCase();
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ageLabel(months: number) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y <= 0) return `${m} mo`;
  if (!m) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}${Date.now().toString(36).slice(-3)}`;
}

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function caseCodeFromCount(n: number) {
  return `CASE-2026-${String(n).padStart(5, "0")}`;
}

export function sampleCodeFromCount(n: number) {
  return `SMP-2026-${String(n).padStart(4, "0")}`;
}

export const CASE_FLOW = [
  "reported",
  "triaged",
  "assigned",
  "examined",
  "sampled",
  "tested",
  "confirmed",
  "treated",
  "closed",
] as const;

export function containmentState(status: string) {
  const order = [
    "detection",
    "risk",
    "verify",
    "sample",
    "lab",
    "confirm",
    "isolate",
    "nearby",
    "prevent",
    "recover",
  ];
  const reached: Record<string, number> = {
    reported: 1,
    triaged: 2,
    assigned: 2,
    examined: 3,
    sampled: 4,
    tested: 5,
    confirmed: 6,
    rejected: 6,
    treated: 8,
    closed: 10,
  };
  const n = reached[status] ?? 1;
  return order.map((id, i) => ({
    id,
    state: i < n - 1 ? "done" : i === n - 1 ? "current" : "wait",
  }));
}

export function toneFor(status: string) {
  if (status === "healthy" || status === "closed" || status === "contained") return "healthy";
  if (status === "observation" || status === "moderate" || status === "due") return "observation";
  if (status === "suspected" || status === "high" || status === "testing" || status === "in_transit") return "suspected";
  if (status === "confirmed" || status === "critical" || status === "overdue") return "confirmed";
  if (status === "recovering" || status === "result_available") return "recovering";
  if (status === "deceased" || status === "rejected") return "deceased";
  return "observation";
}
