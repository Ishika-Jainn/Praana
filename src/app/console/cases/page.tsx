import Link from "next/link";
import { StatusPill } from "@/components/bits";
import { getSnapshot, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatWhen } from "@/lib/format";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  await requireRole(["government","vet","field","lab","farmer"]);
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();
  const animals = user.role === "government" || user.role === "lab" ? snap.animals : visibleAnimals(user, snap.animals);
  const ids = new Set(animals.map((a) => a.id));
  const cases = snap.cases.filter((c) => ids.has(c.animalId));
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">{user.role === "farmer" ? "My livestock cases" : "Case management"}</p>
          <h1>{user.role === "farmer" ? "Health cases & veterinary response" : "Every signal has a file."}</h1>
          <p className="muted">{cases.length} case file{cases.length === 1 ? "" : "s"} in your active scope.</p>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {cases.map((c) => {
          const animal = animals.find((a) => a.id === c.animalId);
          return (
            <Link key={c.id} href={`/console/cases/${c.id}`} className="panel panel-pad" style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 12, alignItems: "center" }}>
              <div>
                <div className="kicker">{c.caseCode}</div>
                <strong>{animal?.name}</strong>
              </div>
              <div>
                <div>{c.suspected}</div>
                <div className="muted">{animal?.farmName}, {animal?.villageName} · {c.summary}</div>
                <div className="faint">Opened {formatWhen(c.openedAt)} · {c.assignedVetName}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "flex-end" }}>
                <StatusPill status={c.status} kind="case" />
                <StatusPill status={c.riskLevel} kind="risk" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
