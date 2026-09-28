import Link from "next/link";
import { FormAction } from "@/components/forms";
import { StatusPill } from "@/components/bits";
import { coverage, getSnapshot, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/format";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VaccinationsPage() {
  await requireRole(["farmer","vet","field","government"]);
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();
  const animals = user.role === "farmer" ? visibleAnimals(user, snap.animals) : snap.animals;
  const latest = new Map<string, (typeof snap.vaccinations)[number]>();
  for (const vax of snap.vaccinations) {
    const key = `${vax.animalId}-${vax.vaccine}`;
    const prev = latest.get(key);
    if (!prev || vax.givenAt > prev.givenAt) latest.set(key, vax);
  }
  const rows = [...latest.values()].filter((v) => animals.some((a) => a.id === v.animalId));
  const now = Date.now();
  const overdue = rows.filter((v) => v.status === "overdue" || (v.nextDue && new Date(v.nextDue).getTime() < now));
  const due = rows.filter((v) => v.status === "due" || (v.nextDue && new Date(v.nextDue).getTime() - now < 86400000 * 21 && new Date(v.nextDue).getTime() >= now));
  const byVillage = snap.villages.map((v) => ({
    name: v.name,
    cover: Math.round(coverage(snap.animals.filter((a) => a.villageId === v.id), snap.vaccinations) * 100),
  }));
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Vaccination</p>
          <h1>Cover, due, overdue.</h1>
          <p className="muted">Network FMD cover {Math.round(coverage(snap.animals, snap.vaccinations) * 100)}%. Overdue animals stay visible until a dose is recorded.</p>
        </div>
      </div>
      <div className="grid-3">
        <div className="stat"><div className="kicker">Overdue doses</div><b>{overdue.length}</b></div>
        <div className="stat"><div className="kicker">Due within 21 days</div><b>{due.length}</b></div>
        <div className="stat"><div className="kicker">District FMD</div><b>{Math.round(coverage(snap.animals.filter((a) => a.districtId === "d-satara"), snap.vaccinations) * 100)}%</b><em>Satara living stock</em></div>
      </div>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <section className="panel panel-pad">
          <h3>Village coverage</h3>
          {byVillage.map((v) => (
            <div key={v.name} style={{ display: "grid", gridTemplateColumns: "120px 1fr 40px", gap: 8, alignItems: "center", marginTop: 8 }}>
              <span>{v.name}</span>
              <div style={{ height: 8, background: "#efe6d8", borderRadius: 99 }}><div style={{ width: `${v.cover}%`, height: "100%", background: v.cover < 75 ? "#c4622d" : "#1f6f5b", borderRadius: 99 }} /></div>
              <span>{v.cover}%</span>
            </div>
          ))}
        </section>
        {user.role === "farmer" ? (
          <section className="panel panel-pad" style={{ borderLeft: "4px solid #1f8a7a" }}>
            <p className="kicker">Official Inoculation Program</p>
            <h3>National Disease Control Advisory</h3>
            <p className="muted" style={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
              Under the National Animal Disease Control Programme (NADCP), scheduled vaccinations (FMD, Brucellosis, Hemorrhagic Septicemia) must be administered and logged by a licensed veterinary officer or village paravet to certify cold-chain compliance and verify 12-digit ear tags.
            </p>
            <div style={{ marginTop: 14 }}>
              <a href="tel:1962" className="btn-copper">Request Mobile Veterinary Camp (1962)</a>
            </div>
          </section>
        ) : (
          <FormAction type="add_vaccination" label="Record vaccination">
            <p className="kicker">New dose</p>
            <label className="field">Animal
              <select name="animalId">{animals.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.id}</option>)}</select>
            </label>
            <label className="field">Vaccine
              <select name="vaccine"><option>FMD</option><option>HS</option><option>BQ</option><option>LSD</option></select>
            </label>
            <label className="field">Dose<input name="dose" defaultValue="2 ml IM" /></label>
            <label className="field">Batch<input name="batch" defaultValue="FMD-MH-26-14" /></label>
            <label className="field">Next due in days<input name="nextDueDays" type="number" defaultValue={180} /></label>
          </FormAction>
        )}
      </div>
      <section className="panel panel-pad" style={{ marginTop: 14 }}>
        <h3>Calendar of attention</h3>
        {overdue.concat(due).slice(0, 12).map((v) => {
          const animal = animals.find((a) => a.id === v.animalId);
          return (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <Link href={`/console/animals/${v.animalId}`}><strong>{animal?.name}</strong> · {v.vaccine} · due {formatDate(v.nextDue)}</Link>
              <StatusPill status={new Date(v.nextDue || 0).getTime() < now ? "overdue" : "due"} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
