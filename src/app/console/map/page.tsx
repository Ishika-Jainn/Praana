import RiskMap from "@/components/map/RiskMap";
import { getSnapshot } from "@/lib/data";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  await requireRole(["government","vet","field"]);
  const snap = await getSnapshot();
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Geospatial surveillance</p>
          <h1>Risk map</h1>
          <p className="muted">Animals, farms, suspected and confirmed cases, clusters, veterinary centres and laboratories. Click a marker to open the twin.</p>
        </div>
      </div>
      <RiskMap animals={snap.animals} farms={snap.farms} facilities={snap.facilities} clusters={snap.clusters} villages={snap.villages} vaccinations={snap.vaccinations} height={720} />
    </div>
  );
}
