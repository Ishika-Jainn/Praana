import TwinLab from "@/components/twin/TwinLab";
import { getSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TwinsPage() {
  const snap = await getSnapshot();
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Twin lab · multi-species</p>
          <h1>Every species gets a living twin.</h1>
          <p className="muted">Cattle, buffalo, goat, sheep, pig, camel and poultry — each with its own anatomy, coat, body regions, vital ranges and disease patterns. Switch modes to see thermal load or the skeletal and organ overlay.</p>
        </div>
      </div>
      <TwinLab animals={snap.animals} />
    </div>
  );
}
