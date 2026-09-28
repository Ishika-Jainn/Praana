import TerritoryExplorer from "@/components/territory";
import { getSnapshot } from "@/lib/data";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HierarchyPage() {
  await requireRole(["government"]);
  const snap = await getSnapshot();
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Territory</p>
          <h1>District to animal</h1>
          <p className="muted">Drill from Maharashtra into Satara or Sangli, then block, village, farm and the individual twin.</p>
        </div>
      </div>
      <TerritoryExplorer snap={snap} />
    </div>
  );
}
