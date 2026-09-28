import { TrendArea, MiniBars } from "@/components/charts";
import { coverage, getSnapshot } from "@/lib/data";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ district?: string; disease?: string }> }) {
  await requireRole(["government","vet"]);
  const { district = "all", disease = "Foot-and-mouth disease" } = await searchParams;
  const snap = await getSnapshot();
  const animals = snap.animals.filter((a) => district === "all" || a.districtId === district);
  const trends = snap.trends.filter((t) => t.disease === disease && (district === "all" ? t.districtId === "d-satara" : t.districtId === district));
  const bySpecies = ["cattle", "buffalo", "goat", "sheep", "pig", "camel", "poultry"].map((s) => ({
    name: s[0].toUpperCase() + s.slice(1, 7),
    value: animals.filter((a) => a.species === s && a.status !== "healthy" && a.status !== "deceased").length,
  }));
  const byVillage = snap.villages.map((v) => ({
    name: v.name.slice(0, 8),
    value: animals.filter((a) => a.villageId === v.id && (a.status === "suspected" || a.status === "confirmed")).length,
  })).filter((v) => v.value > 0);
  const closed = snap.cases.filter((c) => c.closedAt);
  const resolution = closed.length
    ? Math.round(closed.reduce((s, c) => s + (new Date(c.closedAt!).getTime() - new Date(c.openedAt).getTime()) / 86400000, 0) / closed.length)
    : 0;
  const resulted = snap.samples.filter((s) => s.resultAt);
  const tat = resulted.length
    ? Math.round(resulted.reduce((s, sample) => s + (new Date(sample.resultAt!).getTime() - new Date(sample.collectedAt).getTime()) / 86400000, 0) / resulted.length)
    : 0;
  const diseases = [...new Set(snap.trends.map((t) => t.disease))];
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Analytics</p>
          <h1>Prevalence, cover, time.</h1>
        </div>
        <form style={{ display: "flex", gap: 8 }}>
          <select name="district" defaultValue={district}>
            <option value="all">All districts</option>
            <option value="d-satara">Satara</option>
            <option value="d-sangli">Sangli</option>
          </select>
          <select name="disease" defaultValue={disease}>
            {diseases.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button className="btn-primary">Filter</button>
        </form>
      </div>
      <div className="grid-4">
        <div className="stat"><div className="kicker">Animals in filter</div><b>{animals.length}</b></div>
        <div className="stat"><div className="kicker">FMD coverage</div><b>{Math.round(coverage(animals, snap.vaccinations) * 100)}%</b></div>
        <div className="stat"><div className="kicker">Case resolution</div><b>{resolution}d</b><em>Closed files</em></div>
        <div className="stat"><div className="kicker">Lab turnaround</div><b>{tat}d</b><em>Collect to result</em></div>
      </div>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <section className="panel panel-pad">
          <h3>{disease} by month</h3>
          <TrendArea data={trends.map((t) => ({ month: t.month.slice(5), cases: t.cases }))} />
        </section>
        <section className="panel panel-pad">
          <h3>Active clinical load by species</h3>
          <MiniBars data={bySpecies} />
        </section>
        <section className="panel panel-pad">
          <h3>Suspected or confirmed by village</h3>
          <MiniBars data={byVillage.length ? byVillage : [{ name: "None", value: 0 }]} />
        </section>
        <section className="panel panel-pad">
          <h3>Outcome mix</h3>
          <MiniBars data={["healthy", "observation", "suspected", "confirmed", "recovering", "deceased"].map((name) => ({ name: name.slice(0, 6), value: animals.filter((a) => a.status === name).length }))} />
        </section>
      </div>
    </div>
  );
}
