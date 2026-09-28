import Link from "next/link";
import { StatusPill } from "@/components/bits";
import { SubmitAction } from "@/components/forms";
import { FlowRibbon, RoleHero } from "@/components/role";
import { getSnapshot } from "@/lib/data";
import { formatDate, formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { speciesLabel } from "@/lib/species";

export const dynamic = "force-dynamic";

const COLS = ["collected", "in_transit", "received", "testing", "result_available"] as const;

export default async function LabPage() {
  const user = await requireRole(["lab", "vet", "government"]);
  const snap = await getSnapshot();
  const incoming = snap.samples.filter((s) => s.status === "collected" || s.status === "in_transit");
  const testing = snap.samples.filter((s) => s.status === "received" || s.status === "testing");
  const done = snap.samples.filter((s) => s.resultAt);
  const tat = done.length ? (done.reduce((n, s) => n + (new Date(s.resultAt!).getTime() - new Date(s.collectedAt).getTime()) / 86400000, 0) / done.length).toFixed(1) : "—";
  const next = testing.find((s) => s.status === "testing") || testing[0] || incoming[0];
  const isLab = user.role === "lab";

  return (
    <div className="role-page">
      {isLab ? (
        <RoleHero
          role="lab"
          kicker="District Disease Investigation Lab, Satara"
          title={`${incoming.length + testing.length} samples in the chain.`}
          lead="Receive incoming samples, open each one with its animal and case context, record testing and publish the result. Publishing updates the Digital Twin and notifies the veterinarian, field worker and owner."
          action={next ? { label: `Open ${next.sampleCode}`, href: `/console/lab/${next.id}` } : undefined}
          stats={[
            { label: "Incoming", value: incoming.length },
            { label: "On the bench", value: testing.length },
            { label: "Published", value: done.length },
            { label: "Avg turnaround", value: `${tat} d` },
          ]}
          steps={[
            { label: "Incoming samples", state: "done", note: `${incoming.length} arriving` },
            { label: "Open sample + case", href: next ? `/console/lab/${next.id}` : undefined },
            { label: "Record testing", state: "now", note: `${testing.length} on bench` },
            { label: "Publish result", note: "Positive / negative" },
            { label: "Twin + notifications", note: "Automatic" },
          ]}
        />
      ) : (
        <div className="page-head"><div><p className="kicker">Laboratory</p><h1>Sample chain</h1><p className="muted">Read-only view of the laboratory pipeline.</p></div></div>
      )}
      {isLab && <FlowRibbon role="lab" />}
      <div className="kanban lab-kanban">
        {COLS.map((col) => (
          <section key={col}>
            <div className="kan-head">
              <StatusPill status={col} kind="sample" />
              <span>{snap.samples.filter((s) => s.status === col).length}</span>
            </div>
            {snap.samples.filter((s) => s.status === col).map((s) => {
              const animal = snap.animals.find((a) => a.id === s.animalId);
              return (
                <article key={s.id}>
                  <Link href={`/console/lab/${s.id}`} style={{ display: "block" }}>
                    <strong>{s.sampleCode}</strong>
                    <div className="faint">{animal?.name} · {animal ? speciesLabel(animal.species) : ""} · {s.sampleType}</div>
                    <div className="muted" style={{ fontSize: ".85rem" }}>{s.testName}</div>
                    <div className="faint" style={{ fontSize: ".75rem" }}>{formatDate(s.collectedAt)} · {formatWhen(s.collectedAt)}</div>
                    {s.result && <p style={{ margin: "6px 0 0" }}>Result: <b>{s.result}</b></p>}
                  </Link>
                  {isLab && col !== "result_available" && col !== "testing" && (
                    <div style={{ marginTop: 8 }}>
                      <SubmitAction type="advance_sample" payload={{ sampleId: s.id }} className="btn-line">
                        {col === "collected" ? "Mark in transit" : col === "in_transit" ? "Receive" : "Start testing"}
                      </SubmitAction>
                    </div>
                  )}
                  {isLab && col === "testing" && <Link className="btn-primary" style={{ marginTop: 8 }} href={`/console/lab/${s.id}`}>Record result</Link>}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
