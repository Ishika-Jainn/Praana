import Link from "next/link";
import { StatusPill } from "@/components/bits";
import { CaseTrack, FlowRibbon, RoleHero } from "@/components/role";
import { getSnapshot, visibleAlerts, visibleAnimals } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { formatDate, formatWhen } from "@/lib/format";
import { speciesLabel } from "@/lib/species";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FarmerPage() {
  const user = await requireRole(["farmer"]);
  const snap = await getSnapshot();
  const animals = visibleAnimals(user, snap.animals);
  const ids = new Set(animals.map((a) => a.id));
  const alerts = visibleAlerts(user, snap).slice(0, 4);
  const vet = snap.facilities.find((f) => f.kind === "vet_center" && f.name.includes("Karad"));
  const openCases = snap.cases.filter((c) => ids.has(c.animalId) && !["closed", "rejected"].includes(c.status));
  const attention = animals.filter((a) => !["healthy", "deceased"].includes(a.status));
  const updates = snap.timeline
    .filter((t) => ids.has(t.animalId) && ["exam", "sample", "lab", "treatment", "referral", "status", "containment", "recovery"].includes(t.type))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 6);
  const now = Date.now();
  const dueVax = snap.vaccinations
    .filter((v) => ids.has(v.animalId) && v.nextDue && new Date(v.nextDue).getTime() < now + 86400000 * 30)
    .sort((a, b) => String(a.nextDue).localeCompare(String(b.nextDue)));
  const activeTx = snap.treatments.filter((t) => ids.has(t.animalId) && t.status === "active");
  const firstSick = attention[0];

  return (
    <div className="role-page">
      <RoleHero
        role="farmer"
        kicker={`Namaskar, ${user.name.split(" ")[0]}`}
        title={attention.length ? `${attention.length} of your animals need a closer look.` : "Your shed is quiet today."}
        lead="Tap an animal to open its Digital Twin, report what you see, and follow the veterinarian and laboratory as they respond."
        action={animals.length === 0 ? { label: "Register your first animal", href: "/console/register" } : { label: "Report a sick animal", href: firstSick ? `/console/report?animal=${firstSick.id}` : "/console/report" }}
        stats={[
          { label: "Animals", value: animals.length },
          { label: "Need attention", value: attention.length, tone: attention.length ? "#ffd2b0" : undefined },
          { label: "Open cases", value: openCases.length },
          { label: "Vaccines due", value: dueVax.length },
        ]}
        steps={[
          { label: "My animals", href: "/console/animals", state: "done" },
          { label: "Open Digital Twin", href: firstSick ? `/console/animals/${firstSick.id}` : "/console/animals", note: firstSick?.name },
          { label: "Report issue", href: firstSick ? `/console/report?animal=${firstSick.id}` : "/console/report", note: "Photo · body part · symptoms", state: "now" },
          { label: "See recommended action", note: "Instant triage" },
          { label: "Track vet & lab", note: `${openCases.length} active` },
        ]}
      />
      <FlowRibbon role="farmer" />

      <div className="farmer-grid">
        <section>
          <div className="section-head">
            <h2>My animals</h2>
            <Link href="/console/animals">See all →</Link>
          </div>
          {animals.length === 0 ? (
            <div className="panel panel-pad" style={{ textAlign: "center", padding: "32px 16px" }}>
              <p className="muted">You do not have any livestock registered in your shed yet.</p>
              <Link href="/console/register" className="btn-copper" style={{ marginTop: 12 }}>+ Register your first animal</Link>
            </div>
          ) : (
            <div className="herd-tiles">
              {animals.map((a) => (
                <Link key={a.id} href={`/console/animals/${a.id}`} className={`herd-tile st-${a.status}`}>
                  <span className="tile-dot" />
                  <b>{a.name}</b>
                  <small>{speciesLabel(a.species, user.language as Lang)} · {a.breed}</small>
                  <StatusPill status={a.status} />
                  {a.suspectedCondition && a.status !== "healthy" && <em>Possible {a.suspectedCondition}</em>}
                  <span className="tile-go">Open twin →</span>
                </Link>
              ))}
            </div>
          )}

          <div className="section-head" style={{ marginTop: 22 }}>
            <h2>Tracking my cases</h2>
          </div>
          {openCases.length === 0 && <p className="muted">No open cases. Reports you submit will appear here with live veterinary and lab progress.</p>}
          {openCases.map((c) => {
            const a = animals.find((x) => x.id === c.animalId)!;
            const sample = snap.samples.find((s) => s.caseId === c.id);
            return (
              <Link key={c.id} href={`/console/cases/${c.id}`} className="track-card">
                <div className="track-head">
                  <div>
                    <b>{a.name}</b> <span className="faint">· {c.caseCode}</span>
                    <p>Possible {c.suspected} · {c.assignedVetName}</p>
                  </div>
                  <StatusPill status={c.riskLevel} kind="risk" />
                </div>
                <CaseTrack status={c.status} />
                {sample && <p className="faint" style={{ margin: "8px 0 0" }}>Lab: {sample.sampleCode} · {sample.status.replaceAll("_", " ")}{sample.result ? ` · ${sample.result}` : ""}</p>}
              </Link>
            );
          })}
        </section>

        <aside className="farmer-side">
          <section className="panel panel-pad">
            <p className="kicker">What to do now</p>
            {alerts.length === 0 && <p className="muted">No alerts for your animals.</p>}
            {alerts.map((a) => (
              <article key={a.id} className="advice">
                <StatusPill status={a.riskLevel} kind="risk" />
                <h3>{a.title}</h3>
                <p>{a.body.split("\n\n")[0]}</p>
                <p className="advice-do">→ {a.action}</p>
              </article>
            ))}
            <Link href="/console/alerts">All alerts →</Link>
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Updates from vet & lab</p>
            {updates.map((u) => (
              <div key={u.id} className="update-row">
                <i className={`ut-${u.type}`} />
                <div>
                  <b>{u.title}</b>
                  <small>{animals.find((a) => a.id === u.animalId)?.name} · {u.actor} · {formatWhen(u.occurredAt)}</small>
                </div>
              </div>
            ))}
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Vaccines & treatments</p>
            {dueVax.slice(0, 4).map((v) => (
              <div key={v.id} className="update-row"><i className="ut-vaccination" /><div><b>{v.vaccine} · {animals.find((a) => a.id === v.animalId)?.name}</b><small>Due {formatDate(v.nextDue)}</small></div></div>
            ))}
            {activeTx.map((t) => (
              <div key={t.id} className="update-row"><i className="ut-treatment" /><div><b>{t.medicine}</b><small>{animals.find((a) => a.id === t.animalId)?.name} · {t.frequency}</small></div></div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Link className="btn-line" href="/console/vaccinations">Vaccinations</Link>
              <Link className="btn-line" href="/console/treatments">Treatments</Link>
            </div>
          </section>
          <a className="call-vet" href={vet?.phone ? `tel:${vet.phone.replace(/\s/g, "")}` : "tel:1962"}>
            <b>Call veterinarian</b>
            <span>{vet?.name || "Pashu Aarogya Seva Helpline"} · {vet?.phone || "1962"}</span>
          </a>
        </aside>
      </div>
    </div>
  );
}
