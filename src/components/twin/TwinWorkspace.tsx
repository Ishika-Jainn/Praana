"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DISEASES, NEXT_STEPS, pack, regionLabel, symptomLabel } from "@/lib/catalog";
import { ageLabel, formatDate, formatWhen } from "@/lib/format";
import { speciesLabel, SPECIES_META } from "@/lib/species";
import type { AnimalDetail, Lang } from "@/lib/types";
import { generateAnimalNarrative } from "@/lib/voice";
import { Containment, StatusPill, Timeline, TimelineRail } from "../bits";
import { SubmitAction } from "../forms";
import { useI18n } from "../providers";
import VoiceAdviser from "../VoiceAdviser";
import TwinHud, { type RegionEvidence } from "./TwinHud";

const TABS = [
  ["overview", "Overview"],
  ["timeline", "Health timeline"],
  ["symptoms", "Symptoms"],
  ["images", "Images"],
  ["vet", "Veterinary"],
  ["vax", "Vaccinations"],
  ["treat", "Treatments"],
  ["lab", "Laboratory"],
  ["history", "Disease history"],
  ["risk", "Risk analysis"],
  ["location", "Location"],
] as const;

export default function TwinWorkspace({ detail }: { detail: AnimalDetail }) {
  const { lang, t } = useI18n();
  const { animal } = detail;
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("overview");
  const [compare, setCompare] = useState<string[]>([]);
  const latest = detail.reports[0];
  const activeTx = detail.treatments.find((tx) => tx.status === "active");
  const now = useMemo(() => Date.now(), []);
  const evidence = useMemo<RegionEvidence>(() => {
    const out: RegionEvidence = {};
    for (const r of animal.affectedRegions) {
      out[r] = {
        photos: detail.media.filter((m) => m.region === r && m.kind === "photo").map((m) => ({ url: m.url, caption: m.caption })),
        notes: [
          ...detail.reports
            .filter((rep) => rep.regions.includes(r))
            .slice(0, 2)
            .map((rep) => `${formatDate(rep.createdAt)} · ${rep.symptoms.map((s) => symptomLabel(s, lang)).slice(0, 4).join(", ")}`),
          ...detail.vetReports.slice(0, 1).map((v) => `Vet: ${v.findings.slice(0, 110)}${v.findings.length > 110 ? "…" : ""}`),
        ],
      };
    }
    return out;
  }, [detail, animal.affectedRegions, lang]);

  function toggleCompare(id: string) {
    setCompare((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)));
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">{speciesLabel(animal.species, lang)} twin · {SPECIES_META[animal.species]?.group} · {animal.districtName} / {animal.blockName} / {animal.villageName}</p>
          <h1>{animal.name}</h1>
          <p className="muted">{animal.id} · {animal.breed} · {animal.farmName} · {animal.ownerName}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <VoiceAdviser
            text={(curLang) =>
              generateAnimalNarrative({
                name: animal.name,
                species: animal.species,
                breed: animal.breed,
                status: animal.status,
                riskLevel: animal.riskLevel,
                suspectedCondition: animal.suspectedCondition,
                confirmedCondition: animal.confirmedCondition,
                affectedRegions: animal.affectedRegions.map((r) => regionLabel(r, curLang, animal.species)),
                lang: curLang,
              })
            }
            label={lang === "hi" ? "आवाज में सुनें" : lang === "mr" ? "ऑडिओ ऐका" : "Audio Briefing"}
            className="btn-line"
          />
          <StatusPill status={animal.status} />
          <StatusPill status={animal.riskLevel} kind="risk" />
          {animal.openCaseId && <Link className="btn-line" href={`/console/cases/${animal.openCaseId}`}>{animal.openCaseCode}</Link>}
          {animal.status !== "deceased" ? (
            <>
              <Link className="btn-copper" href={`/console/report?animal=${animal.id}`}>Add report</Link>
              <SubmitAction
                type="report_mortality"
                payload={{ animalId: animal.id, cause: animal.suspectedCondition || "Reported mortality at shed" }}
                className="btn-line"
              >
                Report death
              </SubmitAction>
            </>
          ) : (
            <span className="pill tone-critical" style={{ padding: "6px 12px", borderRadius: 99 }}>Animal Deceased</span>
          )}
        </div>
      </div>

      <div className="twin-layout">
        <TwinHud
          species={animal.species}
          breed={animal.breed}
          sex={animal.sex}
          affected={animal.affectedRegions}
          status={animal.status}
          risk={animal.riskLevel}
          symptoms={latest?.symptoms || []}
          title={animal.name}
          subtitle={`${animal.id} · ${animal.confirmedCondition ? `Confirmed ${animal.confirmedCondition}` : animal.suspectedCondition ? `Possible ${animal.suspectedCondition}` : "No active syndrome"}`}
          evidence={evidence}
          reportHref={`/console/report?animal=${animal.id}`}
        />
        <aside className="health-stack">
          <section className="panel panel-pad">
            <p className="kicker">{t("twin.health")}</p>
            <div className="big-status"><StatusPill status={animal.status} /></div>
            <div className="kv">
              <div><span>{t("twin.risk")}</span><b style={{ textTransform: "capitalize" }}>{animal.riskLevel}</b></div>
              <div><span>{t("twin.suspected")}</span><b>{animal.confirmedCondition || animal.suspectedCondition || "None named"}</b></div>
              <div><span>{t("twin.updated")}</span><b>{formatWhen(animal.updatedAt)}</b></div>
              <div><span>{t("twin.exam")}</span><b>{formatWhen(animal.lastExamAt)}</b></div>
              <div><span>{t("twin.vax")}</span><b>{formatWhen(animal.lastVaccinationAt)}</b></div>
              <div><span>{t("twin.treat")}</span><b>{activeTx ? activeTx.medicine : "None active"}</b></div>
            </div>
            <p className="disclaimer">{t("common.disclaimer")}</p>
          </section>
          <section className="panel panel-pad">
            <p className="kicker">Animal profile</p>
            <div className="kv" style={{ marginTop: 8 }}>
              <div><span>Species</span>{speciesLabel(animal.species, lang)}</div>
              <div><span>Breed</span>{animal.breed}</div>
              <div><span>Age</span>{ageLabel(animal.ageMonths)}</div>
              <div><span>Sex</span>{animal.sex}</div>
              <div><span>Weight</span>{animal.weightKg} kg</div>
              <div><span>{animal.species === "poultry" ? "Production" : "Milk"}</span>{animal.species === "poultry" ? "Layer" : `${animal.milkYieldL ?? "—"} L`}</div>
              <div><span>Owner</span>{animal.ownerName}</div>
              <div><span>Farm</span>{animal.farmName}</div>
              <div><span>Village</span>{animal.villageName}</div>
              <div><span>Location</span>{animal.lat.toFixed(3)}, {animal.lng.toFixed(3)}</div>
            </div>
          </section>

        </aside>
      </div>

      <section className="panel panel-pad" style={{ marginTop: 16 }}>
        <p className="kicker">Longitudinal record</p>
        <TimelineRail events={detail.timeline} />
      </section>

      <div className="tabs" style={{ marginTop: 16 }}>
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <section className="panel panel-pad" style={{ marginTop: 8 }}>
        {tab === "overview" && (
          <div className="grid-2">
            <div>
              <h3>Current picture</h3>
              <p>{latest?.triage?.disclaimer || "No field report yet. The twin is the baseline health identity."}</p>
              <p className="muted">{latest?.notes}</p>
              {detail.cases[0] && <Containment status={detail.cases[0].status} />}
            </div>
            <div>
              <h3>Why this risk</h3>
              <ul>
                {(latest?.triage?.evidence || ["No active syndrome on file."]).slice(0, 6).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        )}
        {tab === "timeline" && <Timeline events={detail.timeline} />}
        {tab === "symptoms" && (
          <div>
            {detail.reports.length === 0 && <p className="muted">No symptoms reported.</p>}
            {detail.reports.map((report) => (
              <article key={report.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <strong>{formatDate(report.createdAt)}</strong> · {report.severity} · {report.duration}
                <p>{report.symptoms.map((s) => symptomLabel(s, lang)).join(" · ") || "No checklist items"}</p>
                {report.voiceTranscript && <p className="muted">Voice: “{report.voiceTranscript}”</p>}
                <p>{report.notes}</p>
              </article>
            ))}
          </div>
        )}
        {tab === "images" && (
          <div>
            <p className="muted">Select two plates to compare progression.</p>
            <div className="photo-grid">
              {detail.media.map((m) => (
                <figure key={m.id} onClick={() => toggleCompare(m.id)} style={{ outline: compare.includes(m.id) ? "2px solid #c4622d" : undefined }}>
                  <img src={m.url} alt={m.caption || "Clinical plate"} />
                  <figcaption className="panel-pad" style={{ padding: 8 }}>
                    <strong>{m.caption}</strong>
                    <div className="faint">{m.region || m.kind} · {formatDate(m.capturedAt)} · {m.reporterName}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
            {compare.length === 2 && (
              <div className="compare" style={{ marginTop: 12 }}>
                {compare.map((id) => {
                  const m = detail.media.find((x) => x.id === id);
                  return m ? <figure key={id}><img src={m.url} alt="" /><figcaption>{m.caption} · {formatDate(m.capturedAt)}</figcaption></figure> : null;
                })}
              </div>
            )}
          </div>
        )}
        {tab === "vet" && (
          <div>
            {detail.vetReports.map((v) => (
              <article key={v.id} style={{ marginBottom: 14 }}>
                <strong>{v.vetName}</strong> · {formatDate(v.examinedAt)}
                <p>{v.findings}</p>
                <p className="muted">Possible {v.suspectedDx}. {v.recommendations}</p>
              </article>
            ))}
            {!detail.vetReports.length && <p className="muted">No veterinary report yet.</p>}
          </div>
        )}
        {tab === "vax" && (
          <div className="grid-2">
            {detail.vaccinations.map((v) => (
              <article key={v.id} className="panel panel-pad">
                <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{v.vaccine}</strong><StatusPill status={v.status} /></div>
                <p className="muted">{v.dose} · batch {v.batch}</p>
                <p>Given {formatDate(v.givenAt)} · next {formatDate(v.nextDue)}</p>
                <span className="faint">{v.vetName}</span>
              </article>
            ))}
          </div>
        )}
        {tab === "treat" && (
          <div>
            {detail.treatments.map((tx) => {
              const start = new Date(tx.startDate).getTime();
              const end = tx.endDate ? new Date(tx.endDate).getTime() : start + 86400000 * 5;
              const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
              return (
                <article key={tx.id} style={{ marginBottom: 14 }}>
                  <strong>{tx.medicine}</strong> · {tx.condition}
                  <p>{tx.dosage} · {tx.frequency}</p>
                  <div style={{ height: 8, background: "#efe6d8", borderRadius: 99 }}><div style={{ width: `${pct}%`, height: "100%", background: "#1f6f5b", borderRadius: 99 }} /></div>
                  <p className="muted">{tx.response} · follow-up {formatDate(tx.followUp)} · {tx.vetName}</p>
                </article>
              );
            })}
            {!detail.treatments.length && <p className="muted">No treatment course on file.</p>}
          </div>
        )}
        {tab === "lab" && (
          <div className="grid-2">
            {detail.samples.map((s) => (
              <article key={s.id} className="panel panel-pad">
                <div className="kicker">{s.sampleCode}</div>
                <h3>{s.testName}</h3>
                <StatusPill status={s.status} kind="sample" />
                <p>{s.sampleType} · {s.labName}</p>
                <p className="muted">Collected {formatDate(s.collectedAt)} by {s.collector}</p>
                {s.result && <p>Result: {s.result}. {s.resultNote}</p>}
              </article>
            ))}
            {!detail.samples.length && <p className="muted">No sample in the chain.</p>}
          </div>
        )}
        {tab === "history" && (
          <div>
            {detail.cases.map((c) => (
              <Link key={c.id} href={`/console/cases/${c.id}`} className="panel panel-pad" style={{ display: "block", marginBottom: 8 }}>
                <strong>{c.caseCode}</strong> · {c.suspected}
                <div className="muted">{c.summary}</div>
              </Link>
            ))}
          </div>
        )}
        {tab === "risk" && <RiskPanel detail={detail} lang={lang} />}
        {tab === "location" && (
          <div>
            <p>{animal.farmName}, {animal.villageName}, {animal.blockName}, {animal.districtName}</p>
            <p className="muted">{detail.weather.at(-1)?.note}</p>
            <p>Weather now: {detail.weather.at(-1)?.tempC}°C · humidity {detail.weather.at(-1)?.humidity}% · rain {detail.weather.at(-1)?.rainfallMm} mm</p>
            {detail.cluster && <p><strong>{detail.cluster.title}.</strong> {detail.cluster.summary}</p>}
            <div className="grid-3" style={{ marginTop: 12 }}>
              {detail.nearby.slice(0, 6).map((n) => (
                <Link key={n.id} href={`/console/animals/${n.id}`} className="panel panel-pad">
                  <strong>{n.name}</strong>
                  <div className="faint">{n.distanceKm.toFixed(1)} km · {n.villageName}</div>
                  <StatusPill status={n.status} />
                </Link>
              ))}
            </div>
            <Link className="btn-line" href="/console/map" style={{ marginTop: 12 }}>Open risk map</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function RiskPanel({ detail, lang }: { detail: AnimalDetail; lang: Lang }) {
  const triage = detail.reports[0]?.triage;
  if (!triage) return <p className="muted">No triage on file.</p>;
  const max = Math.max(...triage.scores.map((s) => s.score), 1);
  const disease = DISEASES[triage.diseaseId as keyof typeof DISEASES];
  return (
    <div className="grid-2">
      <div>
        <p className="kicker">Possible / suspected</p>
        <h2>{disease ? pack(lang, { en: disease.name, hi: disease.hi, mr: disease.mr }) : triage.possibleCondition}</h2>
        <p>{disease ? pack(lang, disease.advisory) : triage.disclaimer}</p>
        <p className="disclaimer">{triage.disclaimer}</p>
        {triage.scores.map((s) => (
          <div key={s.diseaseId} style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{s.diseaseId}</span><span>{s.score}</span></div>
            <div style={{ height: 8, background: "#efe6d8", borderRadius: 99 }}><div style={{ width: `${(s.score / max) * 100}%`, height: "100%", background: "#c4622d", borderRadius: 99 }} /></div>
          </div>
        ))}
      </div>
      <div>
        <h3>Supporting evidence</h3>
        <ul>{triage.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
        <h3>Recommended next step</h3>
        <ol>
          {triage.nextStepIds.map((id) => <li key={id}>{NEXT_STEPS[id] ? pack(lang, NEXT_STEPS[id]) : id}</li>)}
        </ol>
        {triage.weatherNote && <p className="muted">{triage.weatherNote}</p>}
      </div>
    </div>
  );
}
