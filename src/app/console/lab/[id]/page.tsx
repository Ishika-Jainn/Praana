import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill, Timeline } from "@/components/bits";
import { FormAction, SubmitAction } from "@/components/forms";
import { CaseTrack } from "@/components/role";
import TwinMini from "@/components/twin/TwinMini";
import { symptomLabel } from "@/lib/catalog";
import { getSnapshot } from "@/lib/data";
import { formatDate, formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { speciesLabel } from "@/lib/species";

export const dynamic = "force-dynamic";

const FLOW = ["collected", "in_transit", "received", "testing", "result_available"];

export default async function SamplePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["lab", "vet", "government"]);
  const { id } = await params;
  const snap = await getSnapshot();
  const s = snap.samples.find((x) => x.id === id);
  if (!s) notFound();
  const a = snap.animals.find((x) => x.id === s.animalId)!;
  const c = snap.cases.find((x) => x.id === s.caseId);
  const report = snap.reports.filter((r) => r.animalId === a.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
  const events = snap.timeline.filter((t) => t.animalId === a.id).slice(-8);
  const step = FLOW.indexOf(s.status);
  const isLab = user.role === "lab";

  return (
    <div className="role-page">
      <div className="page-head">
        <div>
          <p className="kicker"><Link href="/console/lab">Laboratory</Link> · {s.labName}</p>
          <h1>{s.sampleCode}</h1>
          <p className="muted">{s.sampleType} · {s.testName} · collected {formatDate(s.collectedAt)} by {s.collector}</p>
        </div>
        <StatusPill status={s.status} kind="sample" />
      </div>

      <div className="sample-rail">
        {FLOW.map((f, i) => (
          <span key={f} className={i < step ? "done" : i === step ? "now" : ""}><i />{f.replaceAll("_", " ")}</span>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <TwinMini species={a.species} breed={a.breed} sex={a.sex} affected={a.affectedRegions} label={`${a.name} · ${speciesLabel(a.species)} · ${a.breed}`} height={380} />
          <section className="panel panel-pad">
            <p className="kicker">Animal & case</p>
            <div className="kv" style={{ marginTop: 8 }}>
              <div><span>Animal</span><Link href={`/console/animals/${a.id}`}>{a.name} · {a.id}</Link></div>
              <div><span>Owner / farm</span>{a.ownerName} · {a.farmName}</div>
              <div><span>Location</span>{a.villageName}, {a.blockName}, {a.districtName}</div>
              <div><span>Current status</span><StatusPill status={a.status} /></div>
              <div><span>Case</span>{c ? <Link href={`/console/cases/${c.id}`}>{c.caseCode}</Link> : "—"}</div>
              <div><span>Suspected</span>{c?.suspected || a.suspectedCondition || "—"}</div>
            </div>
            {c && <div style={{ marginTop: 12 }}><CaseTrack status={c.status} /></div>}
            {report && <p style={{ marginTop: 12 }}><b>Reported signs:</b> {report.symptoms.map((x) => symptomLabel(x, "en")).join(", ")}</p>}
          </section>
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          {isLab && s.status !== "result_available" && s.status !== "testing" && (
            <section className="panel panel-pad">
              <p className="kicker">Chain of custody</p>
              <p className="muted">Move the sample to the next stage when it physically arrives or goes on the bench.</p>
              <SubmitAction type="advance_sample" payload={{ sampleId: s.id }}>
                {s.status === "collected" ? "Mark in transit" : s.status === "in_transit" ? "Receive at lab" : "Start testing"}
              </SubmitAction>
            </section>
          )}
          {isLab && s.status === "testing" && (
            <FormAction type="record_result" extra={{ sampleId: s.id, condition: c?.suspected || a.suspectedCondition || "the suspected condition" }} label="Publish result → update Digital Twin">
              <p className="kicker">Record testing & publish</p>
              <label className="field">Result
                <select name="result" defaultValue="positive">
                  <option value="positive">Positive — confirms {c?.suspected || "suspected condition"}</option>
                  <option value="negative">Negative — not confirmed</option>
                  <option value="inconclusive">Inconclusive — repeat sample</option>
                </select>
              </label>
              <label className="field">Condition tested<input name="condition" defaultValue={c?.suspected || a.suspectedCondition || ""} /></label>
              <label className="field">Diagnostic Platform / Assay
                <select name="platform" defaultValue="Antigen ELISA + Real-Time PCR">
                  <option value="Antigen ELISA + Real-Time RT-PCR">Antigen ELISA + Real-Time RT-PCR</option>
                  <option value="Fluorescent Antibody Test (FAT)">Fluorescent Antibody Test (FAT)</option>
                  <option value="Giemsa Blood Smear Microscopy">Giemsa Blood Smear Microscopy</option>
                  <option value="Bacterial Culture & Antimicrobial Sensitivity">Bacterial Culture & ABST</option>
                </select>
              </label>
              <label className="field">Method, Serotype & Ct value / Notes<textarea name="resultNote" placeholder="e.g. Antigen ELISA positive, Serotype O; RT-PCR Ct value 21.4 (High viral load)" /></label>
              <p className="faint" style={{ margin: 0 }}>Publishing notifies {c?.assignedVetName || "the veterinarian"}, the field worker and the owner, and writes to {a.name}’s health timeline.</p>
            </FormAction>
          )}
          {isLab && s.status !== "result_available" && (
            <FormAction type="reject_sample" extra={{ sampleId: s.id }} label="Reject sample & request repeat specimen">
              <p className="kicker">Specimen Quality Control</p>
              <label className="field">Rejection reason
                <select name="reason">
                  <option value="Cold chain compromised (vial arrived warm)">Cold chain compromised (vial arrived warm)</option>
                  <option value="Severe hemolysis / clotted specimen">Severe hemolysis / clotted specimen</option>
                  <option value="Leaked / unsealed container">Leaked / contaminated vial</option>
                  <option value="Insufficient volume for extraction">Insufficient volume for extraction</option>
                  <option value="Mislabeled / missing barcode">Mislabeled / missing barcode</option>
                </select>
              </label>
            </FormAction>
          )}
          {s.status === "result_available" && (
            <section className={`panel panel-pad result-card ${s.result === "positive" ? "pos" : ""}`}>
              <p className="kicker">Published result</p>
              <h2 style={{ textTransform: "capitalize" }}>{s.result}</h2>
              <p>{s.resultNote}</p>
              <p className="faint">Published {formatWhen(s.resultAt)} · Digital Twin updated</p>
              <Link className="btn-primary" href={`/console/animals/${a.id}`}>View on Digital Twin</Link>
            </section>
          )}
          <section className="panel panel-pad">
            <p className="kicker">Twin timeline</p>
            <Timeline events={events} />
          </section>
        </div>
      </div>
    </div>
  );
}
