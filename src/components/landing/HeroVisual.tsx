"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const TwinStage = dynamic(() => import("@/components/twin/TwinStage"), {
  ssr: false,
  loading: () => <div className="twin-loading"><span />Calibrating digital twin…</div>,
});

const PHASES = [
  { species: "cattle", breed: "Gir", sex: "female", label: "Cattle", affected: [] as string[], cards: [["Health status", "Healthy", "Gir cow · Gauri"], ["Vaccination", "Up to date", "FMD · HS · BQ"], ["Risk", "Low", "No nearby signal"], ["Last check", "Today", "Shed inspection"]] },
  { species: "cattle", breed: "Gir", sex: "female", label: "Cattle", affected: ["mouth", "hooves"], cards: [["Health status", "Suspected", "Possible FMD"], ["Regions", "Mouth + hooves", "Photo attached"], ["Risk", "High", "Not a diagnosis"], ["Next", "Isolate", "Call veterinarian"]] },
  { species: "buffalo", breed: "Murrah", sex: "female", label: "Buffalo", affected: [], cards: [["Health status", "Healthy", "Murrah · Krishna"], ["Vaccination", "HS current", "Pre-monsoon dose"], ["Risk", "Low", "Rumination normal"], ["Last check", "Yesterday", "Field worker"]] },
  { species: "goat", breed: "Osmanabadi", sex: "female", label: "Goat", affected: ["mouth", "respiratory"], cards: [["Health status", "Suspected", "Possible PPR"], ["Regions", "Mouth + lungs", "Nasal discharge"], ["Risk", "High", "Flock watch"], ["Next", "Swab", "Stop flock movement"]] },
  { species: "sheep", breed: "Madgyal", sex: "male", label: "Sheep", affected: [], cards: [["Health status", "Healthy", "Madgyal ram"], ["Vaccination", "PPR done", "Sheep pox due"], ["Risk", "Low", "Transhumant camp"], ["Last check", "3 days ago", "Camp visit"]] },
  { species: "pig", breed: "Large White Yorkshire", sex: "female", label: "Pig", affected: ["skin", "abdomen"], cards: [["Health status", "Suspected", "Possible ASF"], ["Regions", "Skin + abdomen", "Red blotches"], ["Risk", "Critical", "No movement"], ["Lab", "PCR in transit", "Via RDDL Pune"]] },
  { species: "camel", breed: "Marwari", sex: "female", label: "Camel", affected: [], cards: [["Health status", "Healthy", "Marwari · Heera"], ["Vaccination", "Camelpox", "Current"], ["Risk", "Low", "Migratory route"], ["Location", "Phaltan", "GPS synced"]] },
  { species: "poultry", breed: "Kadaknath", sex: "male", label: "Poultry", affected: ["respiratory", "neck"], cards: [["Health status", "Suspected", "Possible Newcastle"], ["Regions", "Airway + neck", "Twisted neck"], ["Risk", "High", "Backyard flock"], ["Next", "Pen apart", "RD ring vaccination"]] },
];

export default function HeroVisual() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % PHASES.length), 4200);
    return () => clearInterval(t);
  }, [paused]);
  const phase = PHASES[i];
  const pos = [
    { top: 18, left: 12 },
    { top: 28, right: 8 },
    { bottom: 84, left: 14 },
    { bottom: 84, right: 14 },
  ];
  return (
    <div style={{ position: "relative", minHeight: 560 }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="twin-hud" style={{ height: 560 }}>
        <div className="twin-canvas">
          <TwinStage species={phase.species} breed={phase.breed} sex={phase.sex} affected={phase.affected} variant="hero" autoRotate markers={false} />
        </div>
      </div>
      {phase.cards.map(([k, v, s], idx) => (
        <div key={`${i}-${idx}`} className="float-card" style={{ ...pos[idx], animation: "fadeUp .5s ease" }}>
          <span className="faint" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{k}</span>
          <b>{v}</b>
          <span className="muted" style={{ fontSize: 12 }}>{s}</span>
        </div>
      ))}
      <div className="hero-species">
        {PHASES.filter((p, idx) => PHASES.findIndex((q) => q.label === p.label) === idx).map((p) => (
          <button key={p.label} className={phase.label === p.label ? "on" : ""} onClick={() => setI(PHASES.findIndex((q) => q.label === p.label))}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
