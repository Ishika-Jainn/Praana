import Link from "next/link";
import { AnimalCard } from "@/components/bits";
import { getSnapshot } from "@/lib/data";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HerdPage() {
  await requireRole(["government","vet","field"]);
  const snap = await getSnapshot();
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Herd health</p>
          <h1>From shed to animal.</h1>
          <p className="muted">A herd with the same mouth-and-hoof pattern is highlighted as a possible cluster, not as a confirmed outbreak.</p>
        </div>
      </div>
      {snap.clusters.filter((c) => c.status === "active").map((c) => (
        <section key={c.id} className="panel panel-pad" style={{ marginBottom: 14, borderColor: "#e7c2ad" }}>
          <p className="kicker">Possible cluster</p>
          <h2>{c.title}</h2>
          <p>{c.summary}</p>
        </section>
      ))}
      <div style={{ display: "grid", gap: 18 }}>
        {snap.farms.map((farm) => {
          const animals = snap.animals.filter((a) => a.farmId === farm.id);
          const village = snap.villages.find((v) => v.id === farm.villageId);
          const counts = {
            healthy: animals.filter((a) => a.status === "healthy").length,
            sick: animals.filter((a) => !["healthy", "deceased"].includes(a.status)).length,
            suspected: animals.filter((a) => a.status === "suspected").length,
            confirmed: animals.filter((a) => a.status === "confirmed").length,
            deceased: animals.filter((a) => a.status === "deceased").length,
          };
          const clustered = snap.clusters.some((c) => c.status === "active" && c.farmIds.includes(farm.id));
          return (
            <section key={farm.id} className="panel panel-pad" style={{ outline: clustered ? "1px solid #c4622d" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p className="kicker">{village?.name}</p>
                  <h2>{farm.name}</h2>
                  <p className="muted">{farm.ownerName} · {animals.length} twins</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="pill tone-healthy"><i />{counts.healthy} healthy</span>
                  <span className="pill tone-suspected"><i />{counts.suspected} suspected</span>
                  <span className="pill tone-confirmed"><i />{counts.confirmed} confirmed</span>
                  <span className="pill tone-deceased"><i />{counts.deceased} mortality</span>
                </div>
              </div>
              {clustered && <p>Similar clinical pattern to neighbouring sheds inside 5 km. Open each twin before calling it one disease.</p>}
              <div className="grid-3" style={{ marginTop: 12 }}>
                {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
              </div>
              <Link href={`/console/hierarchy`}>Open in the territory tree</Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
