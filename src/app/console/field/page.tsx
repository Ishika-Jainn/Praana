import Link from "next/link";
import { ForwardCase, SyncCard } from "@/components/field-cases";
import { FlowRibbon, RoleHero } from "@/components/role";
import { getSnapshot, visibleAnimals } from "@/lib/data";
import { requireRole } from "@/lib/session";
import { formatWhen } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FieldPage() {
  const user = await requireRole(["field"]);
  const snap = await getSnapshot();
  const animals = visibleAnimals(user, snap.animals);
  const ids = new Set(animals.map((a) => a.id));
  const villages = snap.villages.filter((v) => v.blockId === user.blockId);
  const cases = snap.cases.filter((c) => ids.has(c.animalId) && !["closed", "rejected"].includes(c.status));
  const toForward = cases.filter((c) => ["reported", "triaged"].includes(c.status));
  const myReports = snap.reports.filter((r) => r.reporterName === user.name).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const watch = animals.filter((a) => a.status === "suspected" || a.status === "confirmed");

  return (
    <div className="role-page">
      <RoleHero
        role="field"
        kicker={`${user.title} · ${villages.length} villages`}
        title={toForward.length ? `${toForward.length} cases are waiting to go to the veterinarian.` : "Today’s belt is covered."}
        lead="Register or pick an animal, mark findings on its Digital Twin, add your observations, and forward the case. Everything saves offline and syncs when the tower returns."
        action={{ label: "Start a field report", href: "/console/report" }}
        stats={[
          { label: "Animals in belt", value: animals.length },
          { label: "Cluster watch", value: watch.length, tone: watch.length ? "#ffe3a3" : undefined },
          { label: "To forward", value: toForward.length },
          { label: "Open cases", value: cases.length },
        ]}
        steps={[
          { label: "Assigned villages", note: villages.map((v) => v.name).slice(0, 3).join(", "), state: "done" },
          { label: "Register or select", href: "/console/register", note: "New ear tag" },
          { label: "Photos + twin markers", href: "/console/report", note: "Camera · GPS", state: "now" },
          { label: "Sync offline data", href: "/console/sync" },
          { label: "Forward to vet", note: `${toForward.length} waiting` },
        ]}
      />
      <FlowRibbon role="field" />
      <SyncCard />

      <div className="grid-2" style={{ marginTop: 14 }}>
        <section>
          <div className="section-head"><h2>Cases in my belt</h2><Link href="/console/cases">All cases →</Link></div>
          <div style={{ display: "grid", gap: 10 }}>
            {[...toForward, ...cases.filter((c) => !toForward.includes(c))].slice(0, 8).map((c) => (
              <ForwardCase key={c.id} c={c} animal={animals.find((a) => a.id === c.animalId)} />
            ))}
          </div>
        </section>
        <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <section className="panel panel-pad">
            <p className="kicker">Assigned villages</p>
            {villages.map((v) => {
              const herd = animals.filter((a) => a.villageId === v.id);
              const hot = herd.filter((a) => a.status === "suspected" || a.status === "confirmed").length;
              return (
                <div key={v.id} className="village-row">
                  <div><b>{v.name}</b><small>{herd.length} twins · {v.households} households</small></div>
                  <span className={hot ? "pill tone-suspected" : "pill tone-healthy"}><i />{hot ? `${hot} watch` : "Quiet"}</span>
                </div>
              );
            })}
          </section>
          <section className="panel panel-pad">
            <p className="kicker">My recent reports</p>
            {myReports.length === 0 && <p className="muted">Reports you submit appear here.</p>}
            {myReports.map((r) => {
              const a = snap.animals.find((x) => x.id === r.animalId);
              const c = snap.cases.find((x) => x.id === r.caseId);
              return (
                <Link key={r.id} href={`/console/animals/${r.animalId}`} className="update-row">
                  <i className="ut-report" />
                  <div><b>{a?.name} · {r.triage?.riskLevel || r.severity} risk</b><small>{formatWhen(r.createdAt)} · {c ? c.status : "no case"}</small></div>
                </Link>
              );
            })}
          </section>
          <div className="quick-grid">
            <Link href="/console/register"><b>Register animal</b><span>New ear tag + twin</span></Link>
            <Link href="/console/report"><b>Camera report</b><span>Photo · symptoms · GPS</span></Link>
            <Link href="/console/twins"><b>Twin lab</b><span>All species</span></Link>
            <Link href="/console/map"><b>Risk map</b><span>Belt overview</span></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
