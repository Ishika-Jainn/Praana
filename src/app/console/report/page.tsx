import ReportWizard from "@/components/report/ReportWizard";
import { getSnapshot, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ animal?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();
  const { animal } = await searchParams;
  const animals = user.role === "government" || user.role === "lab" || user.role === "vet" ? snap.animals : visibleAnimals(user, snap.animals);
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Field reporting</p>
          <h1>Report a sick animal</h1>
          <p className="muted">Photograph, mark the twin, speak or tap symptoms. The report becomes triage, a case and a twin update.</p>
        </div>
      </div>
      <ReportWizard animals={animals} user={user} initialAnimalId={animal} />
    </div>
  );
}
