import Link from "next/link";
import { getSnapshot } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getSessionUser, requireRole } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MortalityPage() {
  await requireRole(["government", "vet", "field", "farmer"]);
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();

  const events = snap.mortality.filter((m) => {
    const a = snap.animals.find((x) => x.id === m.animalId);
    if (!a) return false;
    if (user.role === "farmer" && user.farmId) return a.farmId === user.farmId;
    if (user.role === "field" && user.blockId) return a.blockId === user.blockId;
    return true;
  });

  const now = Date.now();
  const recent = events.filter((m) => now - new Date(m.occurredAt).getTime() < 86400000 * 45);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Mortality & Biosecurity Record</p>
          <h1>{user.role === "farmer" ? "Carcass & Mortality Log" : "Deaths are a signal, not a footnote."}</h1>
          <p className="muted">
            {events.length} recorded death{events.length === 1 ? "" : "s"} in your active scope. 
            All mortalities enforce statutory carcass biosecurity protocols to prevent spore dispersal.
          </p>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="panel panel-pad" style={{ textAlign: "center", padding: "32px 16px" }}>
          <p className="muted">No mortality events recorded in your scope. Your herd status is active.</p>
        </div>
      ) : (
        <div className="grid-2">
          {events.map((m) => {
            const animal = snap.animals.find((a) => a.id === m.animalId);
            const village = snap.villages.find((v) => v.id === m.villageId);
            return (
              <article key={m.id} className="panel panel-pad" style={{ borderLeft: "4px solid #b84030" }}>
                <p className="kicker">{formatDate(m.occurredAt)}</p>
                <h2>{animal?.name || "Unknown"}</h2>
                <p><b>Cause:</b> {m.cause}</p>
                <p className="muted">{m.notes || "Under veterinary post-mortem review."}</p>
                <p className="faint">{village?.name} · reported by {m.reportedBy}</p>
                <div style={{ marginTop: 10 }}>
                  {animal && <Link className="btn-line" href={`/console/animals/${animal.id}`}>View Digital Twin</Link>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
