"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { regionLabel } from "@/lib/catalog";
import { estimateVitals, healthIndex, regionsFor, SPECIES_META, speciesLabel } from "@/lib/species";
import type { HealthStatus, RiskLevel, Species } from "@/lib/types";
import {
  generateAnimalNarrative,
  generateRegionNarrative,
  speakText,
  stopSpeaking,
} from "@/lib/voice";
import { useI18n } from "../providers";
import type { TwinMode } from "./LivestockModel";

const TwinStage = dynamic(() => import("./TwinStage"), {
  ssr: false,
  loading: () => (
    <div className="twin-loading">
      <span />
      Calibrating digital twin…
    </div>
  ),
});

export type RegionEvidence = Record<string, { photos: { url: string; caption: string | null }[]; notes: string[] }>;

const STATUS_COLOR: Record<string, string> = {
  healthy: "#3ddc97",
  observation: "#f2c14e",
  suspected: "#ff8a4c",
  confirmed: "#ff4d4d",
  recovering: "#6aa8ff",
  deceased: "#8a8580",
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function Spark({ kind, color, seed }: { kind: string; color: string; seed: number }) {
  const d = useMemo(() => {
    if (kind === "hr") {
      let p = "M0 16";
      for (let x = 0; x < 240; x += 40) p += ` L${x + 14} 16 L${x + 18} 11 L${x + 21} 22 L${x + 24} 3 L${x + 27} 26 L${x + 30} 16 L${x + 40} 16`;
      return p;
    }
    const r = seeded(seed);
    let p = "M0 16";
    for (let x = 6; x <= 240; x += 6) p += ` L${x} ${16 + Math.sin(x / (kind === "rr" ? 14 : 30)) * 6 + (r() - 0.5) * 4}`;
    return p;
  }, [kind, seed]);
  return (
    <svg viewBox="0 0 120 30" className="spark" preserveAspectRatio="none">
      <g className={kind === "hr" ? "ecg" : "drift"}>
        <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default function TwinHud({
  species,
  breed,
  sex,
  affected,
  status,
  risk,
  symptoms = [],
  title,
  subtitle,
  evidence = {},
  reportHref,
  height = 700,
  showIdentity = true,
}: {
  species: Species;
  breed: string;
  sex: "female" | "male";
  affected: string[];
  status: HealthStatus;
  risk: RiskLevel;
  symptoms?: string[];
  title: string;
  subtitle?: string;
  evidence?: RegionEvidence;
  reportHref?: string;
  height?: number;
  showIdentity?: boolean;
}) {
  const { lang } = useI18n();
  const [mode, setMode] = useState<TwinMode>("anatomy");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [view, setView] = useState("threeq");
  const [scan, setScan] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [tags, setTags] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [activeSpeechRegion, setActiveSpeechRegion] = useState<string | null>(null);
  const regions = regionsFor(species, sex);
  const labels = Object.fromEntries(regions.map((r) => [r, regionLabel(r, lang, species)]));
  const vitals = estimateVitals(species, status, risk, symptoms);
  const index = healthIndex(status, risk);
  const color = STATUS_COLOR[status] || "#3ddc97";
  const meta = SPECIES_META[species];
  const fever = vitals[0].state === "high" ? 1 : 0;

  function choose(region: string, speak: boolean = true) {
    const isNew = selected !== region;
    setSelected((cur) => (cur === region ? null : region));
    setFocus((cur) => (cur === region ? null : region));

    if (isNew && speak) {
      const isHot = affected.includes(region);
      const ev = evidence[region];
      const note = ev?.notes?.[0];
      const rName = labels[region] || region;
      const speech = generateRegionNarrative({
        regionName: rName,
        isAffected: isHot,
        notes: note,
        lang,
      });
      setActiveSpeechRegion(region);
      setSpeaking(true);
      speakText(speech, lang, () => {
        setSpeaking(false);
        setActiveSpeechRegion(null);
      });
    }
  }

  function setPreset(v: string) {
    setFocus(null);
    setView(v);
  }

  const circ = 2 * Math.PI * 26;

  return (
    <div className="twin-hud-wrap">
      <div className={`twin-hud mode-${mode}`} style={{ height }}>
        <div className="twin-canvas">
          <TwinStage
            species={species}
            breed={breed}
            sex={sex}
            affected={affected}
            selected={selected}
            hovered={hovered}
            onSelect={choose}
            onHover={setHovered}
            mode={mode}
            view={view}
            focus={focus}
            scan={scan}
            autoRotate={rotate}
            markers={tags}
            labels={labels}
            fever={fever}
            still={status === "deceased"}
          />
        </div>

        <div className="hud-top">
          {showIdentity ? (
            <div className="hud-id">
              <span className="live-dot" style={{ background: color, boxShadow: `0 0 0 4px ${color}33` }} />
              <div>
                <small>LIVE TWIN · {meta.group.toUpperCase()} · {breed.toUpperCase()}</small>
                <b>{title}</b>
                {subtitle && <em>{subtitle}</em>}
              </div>
            </div>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="hud-voice-btn"
              onClick={() => {
                if (speaking) {
                  stopSpeaking();
                  setSpeaking(false);
                  setActiveSpeechRegion(null);
                } else {
                  const speech = generateAnimalNarrative({
                    name: title,
                    species,
                    breed,
                    status,
                    riskLevel: risk,
                    suspectedCondition: subtitle?.includes("Possible") ? subtitle.split("Possible")[1].trim() : null,
                    confirmedCondition: subtitle?.includes("Confirmed") ? subtitle.split("Confirmed")[1].trim() : null,
                    affectedRegions: affected.map((r) => labels[r] || r),
                    lang,
                  });
                  setSpeaking(true);
                  speakText(speech, lang, () => {
                    setSpeaking(false);
                    setActiveSpeechRegion(null);
                  });
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 99,
                background: speaking ? "rgba(196, 98, 45, 0.9)" : "rgba(16, 36, 31, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#f3fbf8",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                backdropFilter: "blur(6px)",
                transition: "all 0.2s ease",
              }}
              title="Click for voice diagnosis & health briefing"
            >
              {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>
                {speaking
                  ? lang === "hi"
                    ? "आवाज रोकें"
                    : lang === "mr"
                      ? "थांबवा"
                      : "Stop Voice"
                  : lang === "hi"
                    ? "बोलकर बताएं"
                    : lang === "mr"
                      ? "आवाज ऐका"
                      : "Voice Briefing"}
              </span>
            </button>

            <div className="hud-seg">
              {(["anatomy", "thermal", "xray"] as TwinMode[]).map((m) => (
                <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
                  {m === "anatomy" ? "Anatomy" : m === "thermal" ? "Thermal" : "X-ray"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hud-gauge">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,.1)" strokeWidth="5" fill="none" />
            <circle cx="32" cy="32" r="26" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={`${(index / 100) * circ} ${circ}`} transform="rotate(-90 32 32)" />
            <text x="32" y="37" textAnchor="middle" fill="#f3fbf8" fontSize="15" fontWeight="600">{index}</text>
          </svg>
          <div>
            <small>TWIN HEALTH INDEX</small>
            <b style={{ color }}>{status === "observation" ? "Under observation" : status[0].toUpperCase() + status.slice(1)}</b>
            <em>Risk · {risk}</em>
          </div>
        </div>

        <div className="hud-right">
          <small className="hud-h">REGION SCAN · {speciesLabel(species, lang)}</small>
          {regions.map((r) => {
            const hot = affected.includes(r);
            const ev = evidence[r];
            const on = selected === r;
            return (
              <div key={r} className={`hud-region ${hot ? "hot" : ""} ${on ? "on" : ""}`} onMouseEnter={() => setHovered(r)} onMouseLeave={() => setHovered(null)}>
                <button onClick={() => choose(r)}>
                  <i />
                  <span>{labels[r]}</span>
                  <em>{hot ? "Finding" : "Nominal"}</em>
                </button>
                {on && (
                  <div className="hud-ev">
                    {ev?.photos[0] && <img src={ev.photos[0].url} alt={ev.photos[0].caption || ""} />}
                    {ev?.notes.slice(0, 2).map((n, i) => <p key={i}>{n}</p>)}
                    {!ev && <p>{hot ? "Marked from the latest clinical picture." : "No finding on this region."}</p>}
                    {reportHref && <Link href={`${reportHref}`}>Report on this region →</Link>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="hud-left">
          <div className="hud-vitals">
            {vitals.map((v, i) => {
              const c = v.state === "high" ? "#ff8a4c" : v.state === "low" ? "#6aa8ff" : v.state === "none" ? "#8a8580" : "#5fe8d0";
              return (
                <div key={v.key} className="hud-vital">
                  <small>{v.label}</small>
                  <b style={{ color: c }}>
                    {v.value ?? "—"}
                    <span>{v.unit}</span>
                  </b>
                  {v.state !== "none" && <Spark kind={v.key} color={c} seed={i * 17 + 3} />}
                  <em>
                    {v.normal[0]}–{v.normal[1]} normal
                  </em>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hud-bottom">
          <div className="hud-tools">
            {[
              ["threeq", "3/4"],
              ["side", "Side"],
              ["front", "Front"],
              ["rear", "Rear"],
              ["top", "Top"],
              ["head", "Head"],
              ["hooves", species === "poultry" ? "Feet" : "Feet"],
            ].map(([id, label]) => (
              <button key={id} className={!focus && view === id ? "on" : ""} onClick={() => setPreset(id)}>
                {label}
              </button>
            ))}
            <span className="sep" />
            <button className={scan ? "on" : ""} onClick={() => setScan((v) => !v)}>Scan</button>
            <button className={rotate ? "on" : ""} onClick={() => setRotate((v) => !v)}>Orbit</button>
            <button className={tags ? "on" : ""} onClick={() => setTags((v) => !v)}>Tags</button>
          </div>
        </div>

        <div className="hud-legend">
          {mode === "thermal" ? (
            <>
              <span>{(meta.vitals.temp[0] - 1).toFixed(0)}°</span>
              <i className="thermal-bar" />
              <span>{(meta.vitals.temp[1] + 1.5).toFixed(0)}°</span>
            </>
          ) : mode === "xray" ? (
            <span>Skeletal + organ overlay · schematic</span>
          ) : (
            <span>Drag to orbit · scroll to zoom · click any body part</span>
          )}
        </div>
      </div>

      <div className="hud-mobile-vitals">
        {vitals.map((v) => (
          <div key={v.key}><small>{v.label}</small><b>{v.value ?? "—"} {v.unit}</b></div>
        ))}
      </div>
      <div className="hud-mobile-regions">
        {regions.map((r) => (
          <button key={r} className={`chip ${selected === r ? "on" : ""}`} onClick={() => choose(r)}>
            {labels[r]}
            {affected.includes(r) ? " ●" : ""}
          </button>
        ))}
      </div>
      <p className="disclaimer" style={{ marginTop: 6 }}>
        Vitals are estimated from the latest field observation for demonstration — not a sensor reading or a diagnosis.
      </p>
    </div>
  );
}
