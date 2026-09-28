"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { REGIONS, SYMPTOMS, regionLabel, symptomLabel } from "@/lib/catalog";
import { regionsFor, speciesLabel } from "@/lib/species";
import { assessRisk, parseVoice } from "@/lib/triage";
import { haversine } from "@/lib/format";
import VoiceAdviser from "../VoiceAdviser";
import { SAMPLE_PHRASE, generateTriageNarrative, speechLang } from "@/lib/voice";
import type { AnimalView, UserView } from "@/lib/types";
import { useI18n, useOffline } from "../providers";

const TwinStage = dynamic(() => import("@/components/twin/TwinStage"), { ssr: false, loading: () => <div className="panel-pad">Loading region picker…</div> });

type Photo = { id: string; dataUrl: string; region: string; caption: string };
type Doc = { id: string; dataUrl: string; name: string; kind: string };

async function compress(file: File): Promise<string> {
  try {
    if (typeof window !== "undefined" && "createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 960 / bitmap.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/jpeg", 0.75);
        }
      } catch {
        // Fallback to FileReader + Image if createImageBitmap fails (e.g. format issues or iOS Safari)
      }
    }
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const scale = Math.min(1, 960 / (img.naturalWidth || 960));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round((img.naturalWidth || 400) * scale));
            canvas.height = Math.max(1, Math.round((img.naturalHeight || 300) * scale));
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/jpeg", 0.75));
              return;
            }
          } catch {
            // ignore canvas error
          }
          resolve(String(reader.result));
        };
        img.onerror = () => resolve(String(reader.result));
        img.src = String(reader.result);
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  } catch {
    return "";
  }
}

export default function ReportWizard({
  animals,
  user,
  initialAnimalId,
}: {
  animals: AnimalView[];
  user: UserView;
  initialAnimalId?: string;
}) {
  const { t, lang } = useI18n();
  const offline = useOffline();
  const [step, setStep] = useState(initialAnimalId && animals.some((a) => a.id === initialAnimalId) ? 1 : 0);
  const [animalId, setAnimalId] = useState(initialAnimalId || "");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState("moderate");
  const [duration, setDuration] = useState("1 day");
  const [notes, setNotes] = useState("");
  const [voice, setVoice] = useState("");
  const [listening, setListening] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<null | {
    local?: boolean;
    triage: ReturnType<typeof assessRisk>;
    caseId?: string | null;
    caseCode?: string | null;
    animalId: string;
    error?: string;
  }>(null);
  const animal = animals.find((a) => a.id === animalId);
  const steps = [t("report.s1"), t("report.s2"), t("report.s3"), t("report.s4"), t("report.s5"), t("report.s6")];

  const preview = useMemo(() => {
    if (!animal) return null;
    const nearby = animals.filter((other) => other.id !== animal.id && haversine(animal, other) <= 5 && (other.status === "suspected" || other.status === "confirmed")).length;
    return assessRisk({
      symptoms,
      regions,
      species: animal.species,
      ageMonths: animal.ageMonths,
      vaccinatedAgainst: [],
      history: [],
      nearbySame: nearby,
      nearbyMortality: 0,
      humidity: animal.villageName === "Kalevadi" || animal.villageName === "Malwadi" ? 78 : 64,
      rainfallMm: 12,
      photoRegions: photos.map((p) => p.region),
    });
  }, [animal, animals, symptoms, regions, photos]);

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function applyTranscript(text: string) {
    setVoice(text);
    const parsed = parseVoice(text);
    setSymptoms((cur) => [...new Set([...cur, ...parsed.symptoms])]);
    setRegions((cur) => [...new Set([...cur, ...parsed.regions])]);
  }

  function listen() {
    const w = window as Window & { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      offline.toast("This browser has no speech engine. The sample phrase still works.");
      return;
    }
    const rec = new SR();
    rec.lang = speechLang(lang);
    rec.onresult = (event) => {
      applyTranscript(event.results[0][0].transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function onPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: Photo[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await compress(file);
      if (dataUrl) {
        next.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dataUrl,
          region: regions[0] || (animal ? regionsFor(animal.species, animal.sex)[0] : "mouth"),
          caption: file.name,
        });
      }
    }
    if (next.length > 0) {
      setPhotos((cur) => [...cur, ...next]);
    }
  }

  async function onDocs(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: Doc[] = [];
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
        if (dataUrl) {
          next.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            dataUrl,
            name: file.name,
            kind: file.type.includes("pdf") ? "document" : "document",
          });
        }
      } catch (e) {
        console.error("Doc read error", e);
      }
    }
    if (next.length > 0) {
      setDocs((cur) => [...cur, ...next]);
    }
  }

  function captureGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }

  async function submit() {
    if (!animal) return;
    setPending(true);
    const payload = {
      animalId: animal.id,
      symptoms,
      regions,
      severity,
      duration,
      notes,
      voiceTranscript: voice,
      language: lang,
      lat: coords?.lat ?? animal.lat,
      lng: coords?.lng ?? animal.lng,
      photos: photos.map((p) => ({ region: p.region, caption: p.caption, dataUrl: p.dataUrl })),
      documents: docs.map((d) => ({ kind: d.kind, caption: d.name, dataUrl: d.dataUrl })),
    };
    if (offline.offline) {
      offline.enqueue({ kind: "report", summary: `${animal.name}: ${symptoms.join(", ") || "report"}`, payload });
      setResult({ local: true, triage: preview || assessRisk({ symptoms, regions, species: animal.species, ageMonths: animal.ageMonths, vaccinatedAgainst: [], history: [], nearbySame: 0, nearbyMortality: 0, humidity: 70, rainfallMm: 0, photoRegions: [] }), animalId: animal.id });
      setPending(false);
      return;
    }
    const res = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setResult({ triage: preview!, animalId: animal.id, error: data.error || "Could not submit" });
      return;
    }
    setResult({ triage: data.triage, caseId: data.caseId, caseCode: data.caseCode, animalId: animal.id });
  }

  if (result?.triage) {
    return (
      <section className="panel panel-pad">
        <p className="kicker">{result.local ? t("common.pending") : t("common.synced")}</p>
        <h1 className="serif">Possible {result.triage.possibleCondition}</h1>
        <div style={{ margin: "10px 0" }}>
          <VoiceAdviser
            text={(curLang) =>
              generateTriageNarrative({
                condition: result.triage.possibleCondition,
                riskLevel: result.triage.riskLevel,
                nextSteps: result.triage.nextSteps,
                lang: curLang,
              })
            }
            label={lang === "hi" ? "सलाह और अगले कदम सुनें (ऑडियो)" : lang === "mr" ? "सल्ला आणि पुढील कृती ऐका (ऑडिओ)" : "Listen to Triage Advisory (Audio)"}
            className="btn-copper"
          />
        </div>
        <p>Risk <strong>{result.triage.riskLevel.toUpperCase()}</strong>. {result.triage.disclaimer}</p>
        <ul>{result.triage.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
        <p><strong>Next steps:</strong> {result.triage.nextSteps.join(" → ")}</p>
        {result.caseCode && (
          <div style={{ background: "rgba(196, 98, 45, 0.08)", border: "1px solid rgba(196, 98, 45, 0.3)", borderRadius: 8, padding: "14px 18px", margin: "16px 0" }}>
            <strong>Case #{result.caseCode} has been logged and assigned to local veterinary officers.</strong>
            <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.88rem" }}>
              The assigned Veterinary Officer will review your symptoms, photos, and history. Keep your animal quarantined in the shed.
            </p>
          </div>
        )}
        {result.error && <p style={{ color: "#dc2626" }}>{result.error}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          {result.caseId && (
            <Link className="btn-copper" href={`/console/cases/${result.caseId}`}>
              Track Case #{result.caseCode || ""} & Doctor Updates →
            </Link>
          )}
          <Link className="btn-primary" href={`/console/animals/${result.animalId}`}>Open Digital Twin</Link>
          <Link className="btn-line" href="/console/farmer">Back to Herd Desk</Link>
          <Link className="btn-line" href="/console/sync">Sync Desk</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="wizard">
      <aside className="panel panel-pad steps">
        {steps.map((label, i) => <div key={label} className={i === step ? "on" : i < step ? "done" : ""}>{i + 1}. {label}</div>)}
      </aside>
      <section className="panel panel-pad">
        {step === 0 && (
          <div>
            <h2>{t("report.s1")}</h2>
            {animals.filter((a) => a.status !== "deceased").length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 16px" }}>
                <p className="muted">No active livestock found in your shed to report on.</p>
                <Link href="/console/register" className="btn-copper" style={{ marginTop: 12, display: "inline-block" }}>+ Register an animal first</Link>
              </div>
            ) : (
              <div className="grid-2">
                {animals.filter((a) => a.status !== "deceased").map((a) => (
                  <button key={a.id} className="animal-card" onClick={() => { setAnimalId(a.id); setStep(1); }} style={{ textAlign: "left", borderColor: a.id === "MH-SAT-00422" ? "#c4622d" : undefined }}>
                    <strong>{a.name}</strong>
                    <div className="faint">{a.id} · {a.farmName}</div>
                    <div className="muted">{speciesLabel(a.species, lang)} · {a.breed} · {a.status}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {step === 1 && (
          <div>
            <h2>{t("report.s2")}</h2>
            <p className="muted">{t("report.photoHint")}</p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "16px 0" }}>
              <label className="btn-copper" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 18px", fontWeight: 600 }}>
                <span>📸</span>
                <span>Take Photo (Camera)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    onPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              <label className="btn-line" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 18px", fontWeight: 600 }}>
                <span>🖼️</span>
                <span>Choose from Gallery / Device</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    onPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {photos.length === 0 ? (
              <div style={{ padding: "28px 16px", border: "1.5px dashed var(--border, #cbd5e1)", borderRadius: 8, textAlign: "center", background: "rgba(0,0,0,0.02)", margin: "16px 0" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
                  📷 No photographs attached yet. Click above to take a photo or select multiple images from your phone or computer.
                </p>
                <small className="faint" style={{ display: "block", marginTop: 8 }}>
                  Recommended: Close-up of lesions, mouth blisters, hoof sores, mastitis in udder, or skin lumps.
                </small>
              </div>
            ) : (
              <div className="photo-grid" style={{ marginTop: 16 }}>
                {photos.map((p) => (
                  <figure key={p.id} style={{ position: "relative", border: "1px solid var(--border, #cbd5e1)", borderRadius: 8, overflow: "hidden", background: "var(--card-bg, #fff)" }}>
                    <div style={{ height: 160, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <img src={p.dataUrl} alt={p.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <figcaption style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
                        Mark Body Region:
                        <select
                          value={p.region}
                          style={{ marginTop: 4, width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid var(--border, #cbd5e1)" }}
                          onChange={(e) => setPhotos(photos.map((x) => (x.id === p.id ? { ...x, region: e.target.value } : x)))}
                        >
                          {REGIONS.filter((r) => !animal || regionsFor(animal.species, animal.sex).includes(r.id)).map((r) => (
                            <option key={r.id} value={r.id}>
                              {regionLabel(r.id, lang, animal?.species)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))}
                        className="btn-line"
                        style={{ color: "#dc2626", borderColor: "#fca5a5", fontSize: "0.82rem", padding: "4px 8px", width: "100%" }}
                      >
                        🗑️ Remove Photo
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        )}
        {step === 2 && animal && (
          <div>
            <h2>{t("report.s3")}</h2>
            <p className="muted">{t("report.regionHint")}</p>
            <div className="twin-hud compact" style={{ height: 460, marginBottom: 12 }}>
              <div className="twin-canvas">
                <TwinStage
                  variant="compact"
                  species={animal.species}
                  breed={animal.breed}
                  sex={animal.sex}
                  affected={regions}
                  hovered={hoverRegion}
                  onHover={setHoverRegion}
                  onSelect={(id) => toggle(regions, id, setRegions)}
                  selected={regions.at(-1) || null}
                  labels={Object.fromEntries(regionsFor(animal.species, animal.sex).map((r) => [r, regionLabel(r, lang, animal.species)]))}
                />
              </div>
              <div className="hud-top">
                <div className="hud-id">
                  <span className="live-dot" />
                  <div>
                    <small>TAP THE {animal.species.toUpperCase()} TO MARK</small>
                    <b>{hoverRegion ? regionLabel(hoverRegion, lang, animal.species) : `${animal.name} · ${animal.breed}`}</b>
                  </div>
                </div>
              </div>
            </div>
            <div className="region-grid">
              {regionsFor(animal.species, animal.sex).map((r) => (
                <button key={r} className={`chip ${regions.includes(r) ? "on" : ""}`} onClick={() => toggle(regions, r, setRegions)}>{regionLabel(r, lang, animal.species)}</button>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2>{t("report.s4")}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <button className="btn-copper" onClick={listen}>{listening ? t("report.listening") : t("report.voice")}</button>
              <button className="btn-line" onClick={() => applyTranscript(SAMPLE_PHRASE)}>{t("report.sample")}</button>
              <button className="btn-line" onClick={captureGps}>{coords ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "Use GPS"}</button>
            </div>
            {voice && <p className="panel panel-pad">“{voice}”</p>}
            <div className="check-grid">
              {SYMPTOMS.map((s) => (
                <button key={s.id} className={`chip ${symptoms.includes(s.id) ? "on" : ""}`} onClick={() => toggle(symptoms, s.id, setSymptoms)}>{symptomLabel(s.id, lang)}</button>
              ))}
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <label className="field">{t("report.severity")}
                <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </label>
              <label className="field">{t("report.duration")}
                <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option>Today</option>
                  <option>1 day</option>
                  <option>2 days</option>
                  <option>3–5 days</option>
                  <option>More than a week</option>
                </select>
              </label>
            </div>
            <label className="field">Notes
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you see in the shed?" />
            </label>
            {preview && <p className="disclaimer">Preliminary pattern: possible {preview.possibleCondition} · {preview.riskLevel}. Confirmed on submit. {preview.disclaimer}</p>}
          </div>
        )}
        {step === 4 && (
          <div>
            <h2>{t("report.s5")}</h2>
            <p className="muted">Veterinary note, laboratory slip, prescription or earlier record. Optional.</p>
            <label className="btn-line" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 18px", marginTop: 8, fontWeight: 600 }}>
              <span>📎</span>
              <span>Attach Documents / Prescription Slips (PDF or Image)</span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  onDocs(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {docs.length > 0 && (
              <ul style={{ marginTop: 16, listStyle: "none", padding: 0 }}>
                {docs.map((d) => (
                  <li key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--border, #cbd5e1)", borderRadius: 6, marginBottom: 8, background: "rgba(0,0,0,0.02)" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>📄 {d.name}</span>
                    <button
                      type="button"
                      className="btn-line"
                      style={{ padding: "4px 10px", fontSize: "0.8rem", color: "#dc2626", borderColor: "#fca5a5" }}
                      onClick={() => setDocs(docs.filter((x) => x.id !== d.id))}
                    >
                      🗑️ Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {step === 5 && animal && (
          <div>
            <h2>{t("report.s6")}</h2>
            <p><strong>{animal.name}</strong> · {animal.id} · {animal.farmName}</p>
            <p>Regions: {regions.map((r) => regionLabel(r, lang)).join(", ") || "—"}</p>
            <p>Symptoms: {symptoms.map((s) => symptomLabel(s, lang)).join(", ") || "—"}</p>
            <p>{photos.length} photos · {docs.length} documents · {severity} · {duration}</p>
            {voice && <p>Voice: {voice}</p>}
            {preview && <p>Preliminary: possible {preview.possibleCondition}, risk {preview.riskLevel}.</p>}
            <button className="btn-copper" disabled={pending} onClick={submit}>{pending ? "Submitting…" : t("common.submit")}</button>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <button className="btn-line" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>{t("common.back")}</button>
          {step < 5 && <button className="btn-primary" disabled={step === 0 && !animalId} onClick={() => setStep((s) => Math.min(5, s + 1))}>{t("common.next")}</button>}
        </div>
      </section>
    </div>
  );
}

type SpeechRec = {
  lang: string;
  start: () => void;
  onresult: (event: { results: { 0: { 0: { transcript: string } } } }) => void;
  onerror: () => void;
  onend: () => void;
};
