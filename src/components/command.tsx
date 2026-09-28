"use client";

import Link from "next/link";
import { TrendArea } from "./charts";
import RiskMap from "./map/RiskMap";
import { StatusPill } from "./bits";
import { coverage } from "@/lib/metrics";
import { formatWhen } from "@/lib/format";
import type { Snapshot } from "@/lib/types";

export default function CommandCenter({ snap }: { snap: Snapshot }) {
  const living = snap.animals.filter((a) => a.status !== "deceased");
  const suspected = snap.animals.filter((a) => a.status === "suspected").length;
  const confirmed = snap.animals.filter((a) => a.status === "confirmed").length;
  const deaths = snap.mortality.length;
  const cover = Math.round(coverage(snap.animals, snap.vaccinations) * 100);
  const active = snap.clusters.filter((c) => c.status === "active");
  const fmd = snap.trends.filter((t) => t.disease === "Foot-and-mouth disease" && t.districtId === "d-satara");
  const pending = snap.cases.filter((c) => !["closed", "rejected"].includes(c.status));
  const labWait = snap.samples.filter((s) => s.status !== "result_available");

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">District command · live surveillance</p>
          <h1>What is moving across Satara and Sangli.</h1>
          <p className="muted">Kalevadi belt is the active hotspot. {active[0]?.summary || "No active cluster."} Sangli remains a watch district, not an outbreak.</p>
        </div>
        <div className="faint">Updated {formatWhen(snap.generatedAt)}</div>
      </div>
      <div className="cmd-metrics">
        <div className="stat"><div className="kicker">Monitored</div><b>{snap.animals.length}</b><em>{living.length} living twins</em></div>
        <div className="stat"><div className="kicker">Suspected</div><b>{suspected}</b><em>Awaiting or under exam</em></div>
        <div className="stat"><div className="kicker">Confirmed</div><b>{confirmed}</b><em>Laboratory anchor</em></div>
        <div className="stat"><div className="kicker">Mortality</div><b>{deaths}</b><em>Separate syndromes</em></div>
        <div className="stat"><div className="kicker">FMD cover</div><b>{cover}%</b><em>Living animals, 180 days</em></div>
        <div className="stat"><div className="kicker">Active clusters</div><b>{active.length}</b><em>Inside 5 km rule</em></div>
      </div>

      <div className="story-strip" style={{ margin: "14px 0" }}>
        <Link href="/console/animals/MH-SAT-00421"><span className="kicker">Animal</span><strong>Gauri</strong><span className="faint">Twin · sample in testing</span></Link>
        <Link href="/console/herd"><span className="kicker">Herd</span><strong>3 sheds</strong><span className="faint">Patil, Shinde, Jadhav</span></Link>
        <Link href="/console/hierarchy"><span className="kicker">Village</span><strong>Kalevadi</strong><span className="faint">Karad block</span></Link>
        <Link href="/console/map"><span className="kicker">District</span><strong>Satara</strong><span className="faint">Sangli quiet</span></Link>
        <Link href="/console/cases"><span className="kicker">Action</span><strong>{pending.length} open</strong><span className="faint">Verify, sample, contain</span></Link>
      </div>

      <div className="grid-2">
        <RiskMap animals={snap.animals} farms={snap.farms} facilities={snap.facilities} clusters={snap.clusters} villages={snap.villages} vaccinations={snap.vaccinations} height={620} />
        <div style={{ display: "grid", gap: 12 }}>
          <section className="panel panel-pad">
            <p className="kicker">Emerging alerts</p>
            {snap.alerts.slice(0, 4).map((a) => (
              <article key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{a.title}</strong>
                  <StatusPill status={a.riskLevel} kind="risk" />
                </div>
                <p className="muted" style={{ margin: "4px 0" }}>{a.body}</p>
                <div className="faint">{a.location} · {a.action}</div>
              </article>
            ))}
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Laboratory queue</p>
            {labWait.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0" }}>
                <span>{s.sampleCode}</span>
                <StatusPill status={s.status} kind="sample" />
              </div>
            ))}
            <Link href="/console/lab">Open laboratory</Link>
          </section>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <section className="panel panel-pad">
          <p className="kicker">Satara FMD trend</p>
          <h3>Seasonal rise into the current month</h3>
          <TrendArea data={fmd.map((t) => ({ month: t.month.slice(5), cases: t.cases, deaths: t.deaths }))} />
        </section>
        <section className="panel panel-pad">
          <p className="kicker">Response queue</p>
          {pending.slice(0, 6).map((c) => {
            const animal = snap.animals.find((a) => a.id === c.animalId);
            return (
              <Link key={c.id} href={`/console/cases/${c.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <span><strong>{c.caseCode}</strong> · {animal?.name} · {animal?.villageName}</span>
                <StatusPill status={c.status} kind="case" />
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
