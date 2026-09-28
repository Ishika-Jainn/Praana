import Link from "next/link";
import { notFound } from "next/navigation";
import { Containment, StatusPill, Timeline } from "@/components/bits";
import { ForwardCase } from "@/components/field-cases";
import { FormAction, SubmitAction } from "@/components/forms";
import { CaseTrack } from "@/components/role";
import TwinMini from "@/components/twin/TwinMini";
import VoiceAdviser from "@/components/VoiceAdviser";
import { regionLabel, symptomLabel } from "@/lib/catalog";
import { getSnapshot } from "@/lib/data";
import { formatDate, formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { speciesLabel } from "@/lib/species";
import { generateDoctorAdvisory } from "@/lib/voice";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["government", "vet", "field", "lab", "farmer"]);
  const { id } = await params;
  const snap = await getSnapshot();
  const item = snap.cases.find((c) => c.id === id);
  if (!item) notFound();
  const animal = snap.animals.find((a) => a.id === item.animalId);
  if (!animal) notFound();

  // Data isolation: ensure farmers only access cases for their own animals
  if (user.role === "farmer" && user.farmId && animal.farmId !== user.farmId) {
    notFound();
  }

  const samples = snap.samples.filter((s) => s.caseId === item.id);
  const reports = snap.reports.filter((r) => r.animalId === item.animalId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const report = reports[0];
  const events = snap.timeline.filter((t) => t.animalId === item.animalId);
  const tx = snap.treatments.filter((t) => t.animalId === animal.id);
  const activeTx = tx.find((t) => t.status === "active");
  const cluster = snap.clusters.find((c) => c.animalIds.includes(animal.id));
  const vet = user.role === "vet";

  return (
    <div className="role-page">
      <div className="page-head">
        <div>
          <p className="kicker"><Link href={user.role === "farmer" ? "/console/farmer" : "/console/cases"}>Cases</Link> · {item.caseCode}</p>
          <h1>{animal.name} <span className="faint" style={{ fontSize: "0.5em" }}>{speciesLabel(animal.species)} · {animal.breed}</span></h1>
          <p className="muted">{animal.ownerName} · {animal.farmName}, {animal.villageName}, {animal.districtName} · opened {formatWhen(item.openedAt)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <StatusPill status={item.riskLevel} kind="risk" />
          <StatusPill status={item.status} kind="case" />
          <Link className="btn-primary" href={`/console/animals/${animal.id}`}>Full Digital Twin</Link>
        </div>
      </div>
      <section className="panel panel-pad"><CaseTrack status={item.status} /></section>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <TwinMini species={animal.species} breed={animal.breed} sex={animal.sex} affected={animal.affectedRegions} label={`${animal.name} · ${animal.affectedRegions.map((r) => regionLabel(r, "en", animal.species)).join(" + ") || "no marked regions"}`} height={400} />
          <section className="panel panel-pad">
            <p className="kicker">Clinical picture</p>
            <p>{item.summary}</p>
            <p><b>Possible {item.suspected}</b> · assigned to {item.assignedVetName || "—"}</p>
            {report && (
              <>
                <p><b>Symptoms:</b> {report.symptoms.map((s) => symptomLabel(s, "en")).join(", ")}</p>
                <p><b>Severity:</b> {report.severity} · {report.duration} · by {report.reporterName}</p>
                {report.voiceTranscript && <p className="muted">🎙 “{report.voiceTranscript}”</p>}
                {report.triage && (
                  <div className="triage-box">
                    <b>Triage · {report.triage.riskLevel} risk</b>
                    <ul>{report.triage.evidence.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
                    <small>{report.triage.disclaimer}</small>
                  </div>
                )}
              </>
            )}
            {cluster && <p className="cluster-note"><b>{cluster.title}.</b> {cluster.summary}</p>}
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Response & containment</p>
            <Containment status={item.status} />
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Health history</p>
            <Timeline events={events} />
          </section>
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          {user.role === "farmer" && (
            <>
              <section className="panel panel-pad" style={{ borderLeft: "4px solid var(--tint, #c4622d)" }}>
                <p className="kicker">Assigned Veterinarian</p>
                <h3>{item.assignedVetName || "District Veterinary Officer"}</h3>
                <p className="muted">Responsible for clinical diagnosis, testing referrals and prescription supervision.</p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <a href="tel:1962" className="btn-copper">Call Veterinary Emergency (1962)</a>
                  <VoiceAdviser
                    text={(curLang) =>
                      generateDoctorAdvisory({
                        doctorName: item.assignedVetName,
                        caseCode: item.caseCode,
                        animalName: animal.name,
                        lang: curLang,
                      })
                    }
                    label="🔊 Listen to Advisory"
                    className="btn-line"
                  />
                  <Link href={`/console/report?animal=${animal.id}`} className="btn-line">Report symptom change</Link>
                </div>
              </section>

              {activeTx && (
                <section className="panel panel-pad" style={{ background: "rgba(196, 98, 45, 0.08)", border: "1px solid #c4622d" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <p className="kicker" style={{ color: "#c4622d", margin: 0 }}>⚠️ Milk & Meat Withdrawal Advisory</p>
                    <VoiceAdviser
                      text={(curLang) =>
                        generateDoctorAdvisory({
                          animalName: animal.name,
                          medicine: activeTx.medicine,
                          lang: curLang,
                        })
                      }
                      label="🔊 Listen to Warning"
                      className="btn-line"
                      style={{ borderColor: "#c4622d", color: "#c4622d", padding: "4px 10px", fontSize: "0.82rem" }}
                    />
                  </div>
                  <p style={{ marginTop: 8 }}><b>Active Medication:</b> {activeTx.medicine} ({activeTx.dosage}, {activeTx.frequency})</p>
                  <p style={{ fontSize: "0.9rem", marginTop: 4 }}>
                    Antibiotic and NSAID residues pass directly into milk. <b>Do NOT consume or sell milk from {animal.name}</b> during medication and for 72 hours after the final dose to safeguard family and consumer health.
                  </p>
                </section>
              )}

              <section className="panel panel-pad">
                <p className="kicker">Shed Care & Isolation Advice</p>
                <ul style={{ paddingLeft: 18, fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                  <li>Isolate {animal.name} from other livestock in a separate shaded stall.</li>
                  <li>Do not share feeding troughs or water buckets with healthy stock.</li>
                  <li>Provide soft green fodder and lukewarm water; apply glycerin/boric paste if mouth blisters appear.</li>
                  <li>Wash hands and footwear with soap or potassium permanganate solution after tending to this animal.</li>
                </ul>
              </section>
            </>
          )}

          {user.role === "field" && <ForwardCase c={item} animal={animal} />}

          {vet && (
            <>
              <FormAction type="examine" extra={{ caseId: item.id, animalId: animal.id }} label="Save veterinary report">
                <p className="kicker">1 · Examine animal</p>
                <label className="field">Clinical findings<textarea name="findings" required placeholder="Temperature, lesions, posture, in-contacts" /></label>
                <label className="field">Diagnosis / suspected diagnosis<input name="suspectedDx" defaultValue={item.suspected || ""} /></label>
                <label className="field">Recommendations<textarea name="recommendations" placeholder="Isolation, sampling, revisit" /></label>
              </FormAction>
              <FormAction type="start_treatment" extra={{ caseId: item.id, animalId: animal.id, condition: item.suspected }} label="Prescribe treatment">
                <p className="kicker">2a · Prescribe treatment</p>
                <label className="field">Medicine<input name="medicine" placeholder="e.g. Flunixin + supportive care" required /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
                  <label className="field">Dosage<input name="dosage" placeholder="1.1 mg/kg" /></label>
                  <label className="field">Frequency<input name="frequency" defaultValue="Once daily" /></label>
                  <label className="field">Days<input name="days" type="number" defaultValue={5} /></label>
                </div>
              </FormAction>
              <FormAction type="request_sample" extra={{ caseId: item.id, animalId: animal.id }} label="Request laboratory sample">
                <p className="kicker">2b · Request laboratory sample</p>
                <label className="field">Sample type<input name="sampleType" defaultValue="Oral epithelium" /></label>
                <label className="field">Test<input name="testName" defaultValue="Antigen ELISA + PCR" /></label>
                <label className="field">Laboratory<input name="labName" defaultValue="District Disease Investigation Lab, Satara" /></label>
              </FormAction>
              <FormAction type="update_case_status" extra={{ caseId: item.id }} label="Update case status">
                <p className="kicker">3 · Update case status</p>
                <select name="status" defaultValue={item.status}>
                  {["assigned", "examined", "sampled", "tested", "confirmed", "rejected", "treated", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input name="note" placeholder="Note for the owner and field worker" />
              </FormAction>
              {activeTx && (
                <FormAction type="schedule_followup" extra={{ treatmentId: activeTx.id }} label="Schedule follow-up">
                  <p className="kicker">4 · Schedule follow-up</p>
                  <input type="date" name="followUp" />
                  <input name="response" placeholder="Response so far" defaultValue={activeTx.response || ""} />
                </FormAction>
              )}
              <FormAction type="record_monitoring" extra={{ animalId: animal.id }} label="Log recovery check">
                <p className="kicker">5 · Monitor recovery</p>
                <select name="outcome" defaultValue="recovering">
                  <option value="recovering">Still recovering</option>
                  <option value="healthy">Recovered</option>
                </select>
                <input name="note" placeholder="Appetite, gait, temperature" />
              </FormAction>
              <div className="panel panel-pad" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <SubmitAction type="escalate" payload={{ caseId: item.id, note: "Escalated by the veterinarian." }} className="btn-line">Escalate to district</SubmitAction>
                <SubmitAction type="report_mortality" payload={{ animalId: animal.id, cause: item.suspected || "Under investigation" }} className="btn-line">Report mortality</SubmitAction>
              </div>
            </>
          )}

          <section className="panel panel-pad">
            <p className="kicker">Laboratory</p>
            {samples.map((s) => (
              <Link key={s.id} href={`/console/lab/${s.id}`} className="update-row">
                <i className="ut-sample" />
                <div><b>{s.sampleCode} · {s.testName}</b><small>{s.status.replaceAll("_", " ")}{s.result ? ` · ${s.result}` : ""} · {formatDate(s.collectedAt)}</small></div>
              </Link>
            ))}
            {!samples.length && <p className="muted">No sample requested.</p>}
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Treatment</p>
            {tx.map((t) => (
              <div key={t.id} className="update-row"><i className="ut-treatment" /><div><b>{t.medicine}</b><small>{t.dosage} · {t.frequency} · follow-up {formatDate(t.followUp)} · {t.response}</small></div></div>
            ))}
            {!tx.length && <p className="muted">No treatment yet.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
