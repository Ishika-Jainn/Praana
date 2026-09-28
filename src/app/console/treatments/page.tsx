import Link from "next/link";
import { getSnapshot, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/format";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TreatmentsPage() {
  await requireRole(["farmer","vet","field","government"]);
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();
  const animals = user.role === "farmer" ? visibleAnimals(user, snap.animals) : snap.animals;
  const rows = snap.treatments.filter((t) => animals.some((a) => a.id === t.animalId));
  const now = Date.now();
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Treatment</p>
          <h1>Courses in motion.</h1>
        </div>
      </div>
      <div className="grid-2">
        {rows.map((tx) => {
          const animal = animals.find((a) => a.id === tx.animalId);
          const start = new Date(tx.startDate).getTime();
          const end = tx.endDate ? new Date(tx.endDate).getTime() : start;
          const pct = Math.max(4, Math.min(100, Math.round(((now - start) / Math.max(1, end - start)) * 100)));
          return (
            <article key={tx.id} className="panel panel-pad">
              <div className="kicker">{tx.status}</div>
              <h2>{animal?.name}</h2>
              <p>{tx.medicine}</p>
              <p className="muted">{tx.dosage} · {tx.frequency} · {tx.condition}</p>
              <div style={{ height: 8, background: "#efe6d8", borderRadius: 99 }}><div style={{ width: `${pct}%`, height: "100%", background: "#1f6f5b", borderRadius: 99 }} /></div>
              <p>Response: {tx.response}</p>
              <p className="faint">{tx.vetName} · follow-up {formatDate(tx.followUp)}</p>
              <Link href={`/console/animals/${tx.animalId}`}>Open twin</Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
