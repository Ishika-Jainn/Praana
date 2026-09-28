import Link from "next/link";
import { AnimalCard } from "@/components/bits";
import { getSnapshot, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();
  const animals = user.role === "government" || user.role === "lab" ? snap.animals : visibleAnimals(user, snap.animals);
  const sp = searchParams ? await searchParams : {};
  const q = (sp.q || "").toLowerCase().trim();
  const st = sp.status || "all";

  const rank = { confirmed: 0, suspected: 1, observation: 2, recovering: 3, healthy: 4, deceased: 5 };
  const filtered = animals.filter((a) => {
    if (st !== "all" && a.status !== st) return false;
    if (q && !`${a.name} ${a.id} ${a.breed} ${a.species} ${a.villageName}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const ordered = [...filtered].sort((a, b) => rank[a.status] - rank[b.status]);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Registry</p>
          <h1>{user.role === "farmer" ? "My livestock shed" : "Animals on the network"}</h1>
          <p className="muted">{ordered.length} digital twin{ordered.length === 1 ? "" : "s"} in your active scope.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/console/register" className="btn-copper">+ Register animal</Link>
          <Link href="/console/report" className="btn-line">Report health issue</Link>
        </div>
      </div>

      <form style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input name="q" defaultValue={sp.q || ""} placeholder="Search name, Ear Tag UID, breed..." style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "inherit", minWidth: 240 }} />
        <select name="status" defaultValue={st} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)", color: "inherit" }}>
          <option value="all">All statuses</option>
          <option value="healthy">Healthy</option>
          <option value="observation">Observation</option>
          <option value="suspected">Suspected</option>
          <option value="confirmed">Confirmed</option>
          <option value="recovering">Recovering</option>
          <option value="deceased">Deceased</option>
        </select>
        <button type="submit" className="btn-line">Filter</button>
      </form>

      {ordered.length === 0 ? (
        <div className="panel panel-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="muted">No animals found matching your filter criteria.</p>
          <Link href="/console/register" className="btn-copper" style={{ marginTop: 12 }}>Add your first animal</Link>
        </div>
      ) : (
        <div className="grid-3">
          {ordered.map((animal) => <AnimalCard key={animal.id} animal={animal} />)}
        </div>
      )}
    </div>
  );
}
