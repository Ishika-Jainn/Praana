"use client";

import Link from "next/link";
import { CASE_STATUS_PACK, SAMPLE_STATUS_PACK, pack, statusLabel } from "@/lib/catalog";
import { ageLabel, containmentState, formatDate, formatDay, formatWhen, toneFor } from "@/lib/format";
import type { AnimalView, TimelineView } from "@/lib/types";
import { useI18n } from "./providers";
import { speciesLabel } from "@/lib/species";

export function StatusPill({ status, kind = "health" }: { status: string; kind?: "health" | "case" | "sample" | "risk" }) {
  const { lang } = useI18n();
  const label =
    kind === "case"
      ? pack(lang, CASE_STATUS_PACK[status] || { en: status, hi: status, mr: status })
      : kind === "sample"
        ? pack(lang, SAMPLE_STATUS_PACK[status] || { en: status, hi: status, mr: status })
        : kind === "risk"
          ? status
          : statusLabel(status, lang);
  return (
    <span className={`pill tone-${toneFor(status)}`}>
      <i />
      {label}
    </span>
  );
}

export function AnimalCard({ animal, href }: { animal: AnimalView; href?: string }) {
  const inner = (
    <article className="animal-card">
      <div className="animal-top">
        <div style={{ display: "flex", gap: 10 }}>
          <div className={`avatar ${animal.species} ${animal.riskLevel === "high" || animal.riskLevel === "critical" ? "risk" : ""}`}>
            {animal.name.slice(0, 1)}
          </div>
          <div>
            <strong>{animal.name}</strong>
            <div className="faint" style={{ fontSize: "0.78rem" }}>{animal.id}</div>
          </div>
        </div>
        <StatusPill status={animal.status} />
      </div>
      <div className="muted" style={{ fontSize: "0.88rem" }}>
        {speciesLabel(animal.species)} · {animal.breed} · {ageLabel(animal.ageMonths)} · {animal.sex}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span className="faint" style={{ fontSize: "0.8rem" }}>{animal.farmName} · {animal.villageName}</span>
        <StatusPill status={animal.riskLevel} kind="risk" />
      </div>
      {animal.suspectedCondition && <div style={{ fontSize: "0.84rem" }}>Possible {animal.suspectedCondition}</div>}
    </article>
  );
  return <Link href={href || `/console/animals/${animal.id}`}>{inner}</Link>;
}

export function Timeline({ events }: { events: TimelineView[] }) {
  const ordered = [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  if (!ordered.length) return <p className="muted">No events yet. Registration will appear here.</p>;
  return (
    <ol className="timeline">
      {ordered.map((event) => (
        <li key={event.id}>
          <time>{formatDay(event.occurredAt)}</time>
          <div>
            <strong>{event.title}</strong>
            {event.detail && <p>{event.detail}</p>}
            <span>{event.actor || "Praana"} · {formatWhen(event.occurredAt)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TimelineRail({ events }: { events: TimelineView[] }) {
  const ordered = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return (
    <div className="rail">
      {ordered.map((event) => (
        <article key={event.id}>
          <i />
          <time className="faint" style={{ fontSize: "0.72rem" }}>{formatDay(event.occurredAt)}</time>
          <strong>{event.title}</strong>
          <p>{event.detail || event.actor}</p>
        </article>
      ))}
    </div>
  );
}

const CONTAINMENT_LABELS: Record<string, string> = {
  detection: "Detection",
  risk: "Risk assessment",
  verify: "Veterinary verification",
  sample: "Sample collection",
  lab: "Laboratory",
  confirm: "Confirmation",
  isolate: "Isolation / treatment",
  nearby: "Nearby surveillance",
  prevent: "Prevention",
  recover: "Recovery monitoring",
};

export function Containment({ status }: { status: string }) {
  const steps = containmentState(status);
  return (
    <div className="contain">
      {steps.map((step) => (
        <div key={step.id} className={step.state}>
          <strong style={{ display: "block", marginBottom: 4 }}>{CONTAINMENT_LABELS[step.id]}</strong>
          <span className="faint">{step.state === "done" ? "Done" : step.state === "current" ? "Now" : "Waiting"}</span>
        </div>
      ))}
    </div>
  );
}

export function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="stat">
      <div className="kicker">{label}</div>
      <b>{value}</b>
      {note && <em>{note}</em>}
    </div>
  );
}

export function When({ value }: { value: string | null }) {
  return <>{formatWhen(value)}</>;
}

export function DateText({ value }: { value: string | null }) {
  return <>{formatDate(value)}</>;
}
