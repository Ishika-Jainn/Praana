import Link from "next/link";
import type { Role } from "@/lib/types";

const THEME: Record<Role, { a: string; b: string; ink: string; label: string }> = {
  farmer: { a: "#7a3413", b: "#c4622d", ink: "#fff4ea", label: "Livestock Owner" },
  field: { a: "#5e4508", b: "#b8860b", ink: "#fff8e6", label: "Field Worker" },
  vet: { a: "#0b4a42", b: "#1f8a7a", ink: "#eafffa", label: "Veterinarian" },
  lab: { a: "#232a7a", b: "#4f5bd5", ink: "#eef0ff", label: "Laboratory" },
  government: { a: "#07110f", b: "#17352c", ink: "#f6f1e7", label: "Government Officer" },
};

export type JourneyStep = { label: string; href?: string; note?: string; state?: "done" | "now" | "next" };

export function RoleHero({
  role,
  kicker,
  title,
  lead,
  steps,
  stats,
  action,
}: {
  role: Role;
  kicker: string;
  title: string;
  lead: string;
  steps: JourneyStep[];
  stats?: { label: string; value: string | number; tone?: string }[];
  action?: { label: string; href: string };
}) {
  const t = THEME[role];
  return (
    <section className={`role-hero role-${role}`} style={{ ["--ra" as string]: t.a, ["--rb" as string]: t.b, ["--ri" as string]: t.ink }}>
      <div className="role-hero-top">
        <div>
          <span className="role-badge">{t.label}</span>
          <p className="role-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="role-lead">{lead}</p>
        </div>
        {action && (
          <Link className="role-cta" href={action.href}>
            {action.label} →
          </Link>
        )}
      </div>
      {stats && (
        <div className="role-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <b style={s.tone ? { color: s.tone } : undefined}>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <ol className="journey">
        {steps.map((s, i) => {
          const inner = (
            <>
              <i>{s.state === "done" ? "✓" : i + 1}</i>
              <div>
                <b>{s.label}</b>
                {s.note && <small>{s.note}</small>}
              </div>
            </>
          );
          return (
            <li key={s.label} className={s.state || "next"}>
              {s.href ? <Link href={s.href}>{inner}</Link> : <span>{inner}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const PIPE = [
  { id: "register", label: "Registration", roles: ["field", "farmer"] },
  { id: "twin", label: "Digital Twin", roles: ["farmer", "field", "vet", "lab", "government"] },
  { id: "report", label: "Health report", roles: ["farmer", "field"] },
  { id: "triage", label: "AI triage", roles: [] },
  { id: "vet", label: "Vet review", roles: ["vet"] },
  { id: "lab", label: "Laboratory", roles: ["lab"] },
  { id: "result", label: "Diagnosis / result", roles: ["vet", "lab"] },
  { id: "treat", label: "Treatment / containment", roles: ["vet", "government"] },
  { id: "recover", label: "Recovery", roles: ["vet", "farmer"] },
  { id: "history", label: "Health history", roles: ["farmer", "field", "vet", "lab", "government"] },
];

export function FlowRibbon({ role }: { role: Role }) {
  return (
    <div className="flow-ribbon" aria-label="Application-wide health flow">
      {PIPE.map((p) => (
        <span key={p.id} className={(p.roles as string[]).includes(role) ? "mine" : p.id === "triage" ? "auto" : ""}>
          {p.label}
        </span>
      ))}
      <em>Your steps are highlighted · triage runs automatically · every step writes to the Digital Twin</em>
    </div>
  );
}

export function CaseTrack({ status }: { status: string }) {
  const flow = ["reported", "triaged", "assigned", "examined", "sampled", "tested", "confirmed", "treated", "closed"];
  const labels: Record<string, string> = {
    reported: "Reported",
    triaged: "Triaged",
    assigned: "Vet assigned",
    examined: "Examined",
    sampled: "Sampled",
    tested: "Tested",
    confirmed: "Result",
    treated: "Treatment",
    closed: "Closed",
  };
  const idx = flow.indexOf(status === "rejected" ? "confirmed" : status);
  return (
    <div className="case-track">
      {flow.map((s, i) => (
        <span key={s} className={i < idx ? "done" : i === idx ? "now" : ""}>
          <i />
          {labels[s]}
        </span>
      ))}
    </div>
  );
}
