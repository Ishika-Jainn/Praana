import Link from "next/link";
import { StatusPill } from "@/components/bits";
import { FormAction } from "@/components/forms";
import { CaseTrack, FlowRibbon, RoleHero } from "@/components/role";
import { getSnapshot, visibleAnimals } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { formatDate, formatWhen } from "@/lib/format";
import { speciesLabel } from "@/lib/species";

export const dynamic = "force-dynamic";

const RANK: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

export default async function VetPage() {
  const user = await requireRole(["vet"]);
  const snap = await getSnapshot();
  const animals = visibleAnimals(user, snap.animals);
  const ids = new Set(animals.map((a) => a.id));
  const open = snap.cases.filter((c) => ids.has(c.animalId) && !["closed", "rejected"].includes(c.status)).sort((a, b) => RANK[a.riskLevel] - RANK[b.riskLevel]);
  const toExamine = open.filter((c) => ["reported", "triaged", "assigned"].includes(c.status));
  const referrals = snap.samples.filter((s) => ids.has(s.animalId) && s.status !== "result_available");
  const results = snap.samples.filter((s) => ids.has(s.animalId) && s.status === "result_available").sort((a, b) => String(b.resultAt).localeCompare(String(a.resultAt))).slice(0, 3);
  const follow = snap.treatments.filter((t) => ids.has(t.animalId) && t.followUp && t.status === "active").sort((a, b) => String(a.followUp).localeCompare(String(b.followUp)));
  const recovering = animals.filter((a) => a.status === "recovering");
  const top = toExamine[0] || open[0];

  return (
    <div className="role-page">
      <RoleHero
        role="vet"
        kicker={user.title || "Veterinary Officer"}
        title={toExamine.length ? `${toExamine.length} animals are waiting for examination.` : "No pending examinations."}
        lead="Open a case to see the animal’s Digital Twin, full history, photos and triage. Examine, prescribe, request a sample, and schedule follow-up — every entry updates the twin."
        action={top ? { label: `Open ${top.caseCode}`, href: `/console/cases/${top.id}` } : undefined}
        stats={[
          { label: "Critical / high", value: open.filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").length, tone: "#ffd0b8" },
          { label: "To examine", value: toExamine.length },
          { label: "Lab pending", value: referrals.length },
          { label: "Recovering", value: recovering.length },
        ]}
        steps={[
          { label: "Case queue", state: "done", note: `${open.length} open` },
          { label: "Twin + history", href: top ? `/console/animals/${top.animalId}` : undefined, note: "Photos · symptoms" },
          { label: "Examine & report", href: top ? `/console/cases/${top.id}` : undefined, state: "now" },
          { label: "Treat / request sample", note: `${referrals.length} in lab` },
          { label: "Follow-up & recovery", note: `${follow.length} scheduled` },
        ]}
      />
      <FlowRibbon role="vet" />

      <div className="vet-grid">
        <section>
          <div className="section-head"><h2>Triage queue</h2><Link href="/console/cases">All cases →</Link></div>
          <div style={{ display: "grid", gap: 10 }}>
            {open.slice(0, 9).map((c) => {
              const a = animals.find((x) => x.id === c.animalId)!;
              return (
                <Link key={c.id} href={`/console/cases/${c.id}`} className={`queue-card risk-${c.riskLevel}`}>
                  <div className="track-head">
                    <div>
                      <b>{a.name}</b> <span className="faint">· {speciesLabel(a.species)} · {c.caseCode}</span>
                      <p>Possible {c.suspected} · {a.farmName}, {a.villageName}</p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <StatusPill status={c.riskLevel} kind="risk" />
                    </div>
                  </div>
                  <CaseTrack status={c.status} />
                  <p className="faint" style={{ margin: "6px 0 0" }}>Opened {formatWhen(c.openedAt)} · regions: {a.affectedRegions.join(", ") || "—"}</p>
                </Link>
              );
            })}
          </div>
        </section>
        <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <section className="panel panel-pad">
            <p className="kicker">Laboratory referrals</p>
            {referrals.map((s) => (
              <Link key={s.id} href={`/console/animals/${s.animalId}`} className="update-row">
                <i className="ut-sample" />
                <div><b>{s.sampleCode} · {animals.find((a) => a.id === s.animalId)?.name}</b><small>{s.testName} · {s.status.replaceAll("_", " ")}</small></div>
              </Link>
            ))}
            {results.map((s) => (
              <Link key={s.id} href={`/console/animals/${s.animalId}`} className="update-row">
                <i className="ut-lab" />
                <div><b>Result: {s.result} · {animals.find((a) => a.id === s.animalId)?.name}</b><small>{s.sampleCode} · {formatWhen(s.resultAt)}</small></div>
              </Link>
            ))}
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Follow-ups</p>
            {follow.map((t) => (
              <Link key={t.id} href={`/console/animals/${t.animalId}`} className="update-row">
                <i className="ut-treatment" />
                <div><b>{animals.find((a) => a.id === t.animalId)?.name} · {t.medicine}</b><small>Due {formatDate(t.followUp)} · {t.response}</small></div>
              </Link>
            ))}
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Recovery monitoring</p>
            {recovering.map((a) => (
              <div key={a.id} style={{ marginBottom: 10 }}>
                <Link href={`/console/animals/${a.id}`}><b>{a.name}</b> <span className="faint">· {a.confirmedCondition || a.suspectedCondition}</span></Link>
                <FormAction type="record_monitoring" extra={{ animalId: a.id }} label="Log check">
                  <div style={{ display: "flex", gap: 6 }}>
                    <select name="outcome" defaultValue="recovering" style={{ flex: "0 0 auto" }}>
                      <option value="recovering">Still recovering</option>
                      <option value="healthy">Recovered</option>
                    </select>
                    <input name="note" placeholder="Appetite, gait, temperature…" style={{ flex: 1, minWidth: 0 }} />
                  </div>
                </FormAction>
              </div>
            ))}
            {recovering.length === 0 && <p className="muted">No animals in recovery.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
