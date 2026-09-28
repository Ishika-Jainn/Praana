import Link from "next/link";
import CommandCenter from "@/components/command";
import { FormAction, SubmitAction } from "@/components/forms";
import { FlowRibbon, RoleHero } from "@/components/role";
import { StatusPill } from "@/components/bits";
import { getSnapshot } from "@/lib/data";
import { coverage } from "@/lib/metrics";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CommandPage() {
  await requireRole(["government"]);
  const snap = await getSnapshot();
  const active = snap.clusters.filter((c) => c.status === "active");
  const suspected = snap.animals.filter((a) => a.status === "suspected").length;
  const confirmed = snap.animals.filter((a) => a.status === "confirmed").length;
  const hot = active[0];
  const labPending = snap.samples.filter((s) => s.status !== "result_available").length;
  const unexamined = snap.cases.filter((c) => ["reported", "triaged", "assigned"].includes(c.status)).length;

  return (
    <div className="role-page">
      <RoleHero
        role="government"
        kicker="District command · Satara & Sangli"
        title={hot ? `${active.length} active cluster${active.length > 1 ? "s" : ""} · ${hot.title.replace("Potential ", "")}` : "No active clusters."}
        lead="Move from district to block, village, herd and individual Digital Twin. Watch veterinary and laboratory response, issue advisories, and coordinate containment."
        action={{ label: "Open risk map", href: "/console/map" }}
        stats={[
          { label: "Suspected", value: suspected, tone: "#ffb58a" },
          { label: "Confirmed", value: confirmed, tone: "#ff8c8c" },
          { label: "Mortality", value: snap.mortality.length },
          { label: "FMD coverage", value: `${Math.round(coverage(snap.animals, snap.vaccinations) * 100)}%` },
        ]}
        steps={[
          { label: "District overview", href: "/console/hierarchy", state: "done" },
          { label: "Risk map", href: "/console/map" },
          { label: "Clusters", href: "/console/herd", note: `${active.length} active`, state: "now" },
          { label: "Vet & lab response", href: "/console/cases", note: `${unexamined} unexamined · ${labPending} in lab` },
          { label: "Advisories & containment", note: "Below" },
        ]}
      />
      <FlowRibbon role="government" />

      <section className="response-console">
        <div>
          <p className="kicker">Coordinate containment</p>
          {active.length === 0 && <p className="muted">No active clusters to respond to.</p>}
          {active.map((cl) => (
            <article key={cl.id} className="cluster-card">
              <div className="track-head">
                <div>
                  <b>{cl.title}</b>
                  <p>{cl.summary}</p>
                </div>
                <StatusPill status={cl.riskLevel} kind="risk" />
              </div>
              <div className="cluster-animals">
                {cl.animalIds.slice(0, 8).map((id) => {
                  const a = snap.animals.find((x) => x.id === id);
                  return a ? <Link key={id} href={`/console/animals/${id}`} className={`mini-twin st-${a.status}`}>{a.name}</Link> : null;
                })}
              </div>
              <div className="cluster-actions">
                <SubmitAction type="cluster_action" payload={{ clusterId: cl.id, step: "movement_hold" }} className="btn-line">Movement hold</SubmitAction>
                <SubmitAction type="cluster_action" payload={{ clusterId: cl.id, step: "surveillance" }} className="btn-line">Door-to-door surveillance</SubmitAction>
                <SubmitAction type="cluster_action" payload={{ clusterId: cl.id, step: "ring_vaccination" }} className="btn-line">Ring vaccination</SubmitAction>
                <SubmitAction type="cluster_action" payload={{ clusterId: cl.id, step: "contained" }} className="btn-copper">Declare contained</SubmitAction>
              </div>
            </article>
          ))}
        </div>
        <FormAction type="issue_advisory" label="Issue advisory">
          <p className="kicker">Issue alert / advisory</p>
          <label className="field">Title<input name="title" required defaultValue="FMD movement advisory — Karad block" /></label>
          <label className="field">Message (English)<textarea name="body" required defaultValue="Suspected foot-and-mouth disease in Kalevadi–Malwadi. Do not move cattle or buffalo to markets for 21 days. Report drooling or lameness immediately." /></label>
          <label className="field">हिंदी<textarea name="bodyHi" defaultValue="कलेवाडी–मालवाडी में संभावित खुरपका-मुँहपका। 21 दिन तक पशुओं को बाज़ार न ले जाएँ। लार या लंगड़ापन दिखे तो तुरंत बताएं।" /></label>
          <label className="field">मराठी<textarea name="bodyMr" defaultValue="कलेवाडी–मालवाडी येथे संशयित खुरपका-तोंडपाका. २१ दिवस जनावरे बाजारात नेऊ नका. लाळ किंवा लंगडेपणा दिसल्यास लगेच कळवा." /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label className="field">Audience
              <select name="audience" defaultValue="everyone">
                <option value="everyone">All field roles</option>
                <option value="farmer">Livestock owners</option>
                <option value="field">Field workers</option>
                <option value="vet">Veterinarians</option>
              </select>
            </label>
            <label className="field">Risk
              <select name="riskLevel" defaultValue="high">
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          <input type="hidden" name="location" value="Karad block, Satara" />
        </FormAction>
      </section>

      <CommandCenter snap={snap} />
    </div>
  );
}
