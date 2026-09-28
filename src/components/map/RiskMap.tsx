"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AnimalView, ClusterView, FacilityView, FarmView, VaccinationView, VillageView } from "@/lib/types";
import { StatusPill } from "../bits";

const BOUNDS = { minLat: 16.55, maxLat: 18.65, minLng: 73.55, maxLng: 75.05 };
const W = 1000;
const H = 780;

function project(lat: number, lng: number) {
  return {
    x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W,
    y: ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H,
  };
}

const RIVER = [
  [17.95, 73.95],
  [17.45, 74.12],
  [17.28, 74.18],
  [17.05, 74.4],
  [16.85, 74.56],
  [16.7, 74.78],
];

export default function RiskMap({
  animals,
  farms,
  facilities,
  clusters,
  villages,
  vaccinations = [],
  height = 640,
}: {
  animals: AnimalView[];
  farms: FarmView[];
  facilities: FacilityView[];
  clusters: ClusterView[];
  villages: VillageView[];
  vaccinations?: VaccinationView[];
  height?: number;
}) {
  const [disease, setDisease] = useState("all");
  const [status, setStatus] = useState("all");
  const [species, setSpecies] = useState("all");
  const [district, setDistrict] = useState("all");
  const [layer, setLayer] = useState<"cases" | "coverage" | "mortality">("cases");
  const [cam, setCam] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [selected, setSelected] = useState<AnimalView | null>(null);

  const diseases = useMemo(
    () => ["all", ...new Set(animals.map((a) => a.confirmedCondition || a.suspectedCondition).filter(Boolean) as string[])],
    [animals],
  );
  const filtered = animals.filter((a) => {
    if (status !== "all" && a.status !== status) return false;
    if (species !== "all" && a.species !== species) return false;
    if (district !== "all" && a.districtId !== district) return false;
    if (disease !== "all") {
      const name = a.confirmedCondition || a.suspectedCondition || "";
      if (!name.toLowerCase().includes(disease.toLowerCase().slice(0, 8)) && name !== disease) return false;
    }
    if (layer === "mortality") return a.status === "deceased";
    if (layer === "cases") return true;
    return true;
  });

  const cutoff = useMemo(() => Date.now() - 1000 * 60 * 60 * 24 * 180, []);

  const coverage = (villageId: string) => {
    const herd = animals.filter((a) => a.villageId === villageId && a.status !== "deceased");
    if (!herd.length) return 0;
    const covered = herd.filter((a) => vaccinations.some((v) => v.animalId === a.id && v.vaccine === "FMD" && new Date(v.givenAt).getTime() >= cutoff));
    return covered.length / herd.length;
  };

  function color(animal: AnimalView) {
    if (animal.status === "confirmed" || animal.riskLevel === "critical") return "#b42318";
    if (animal.status === "suspected") return "#c4622d";
    if (animal.status === "observation") return "#d4a017";
    if (animal.status === "recovering") return "#1d4f8a";
    if (animal.status === "deceased") return "#514c45";
    return "#1f8a5b";
  }

  return (
    <div className="map-shell" style={{ height }}>
      <div className="map-ui top">
        <select className="chip" value={disease} onChange={(e) => setDisease(e.target.value)}>
          {diseases.map((d) => <option key={d} value={d}>{d === "all" ? "All diseases" : d}</option>)}
        </select>
        <select className="chip" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["all", "healthy", "observation", "suspected", "confirmed", "recovering", "deceased"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="chip" value={species} onChange={(e) => setSpecies(e.target.value)}>
          <option value="all">All species</option>
          {["cattle", "buffalo", "goat", "sheep", "pig", "camel", "poultry"].map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className="chip" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="all">All districts</option>
          <option value="d-satara">Satara</option>
          <option value="d-sangli">Sangli</option>
        </select>
        {(["cases", "coverage", "mortality"] as const).map((item) => (
          <button key={item} className={`chip ${layer === item ? "on" : ""}`} onClick={() => setLayer(item)}>{item}</button>
        ))}
        <button className="chip" onClick={() => setCam({ x: 0, y: 0, k: 1 })}>Reset</button>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onWheel={(e) => {
          e.preventDefault();
          const next = Math.min(2.6, Math.max(1, cam.k * (e.deltaY < 0 ? 1.08 : 0.92)));
          setCam((c) => ({ ...c, k: next }));
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setCam((c) => ({
            ...c,
            x: drag.current!.cx + (e.clientX - drag.current!.x),
            y: drag.current!.cy + (e.clientY - drag.current!.y),
          }));
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        <defs>
          <radialGradient id="heat-red" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#b42318" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#b42318" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heat-amber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c4622d" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c4622d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1c3b32" />
            <stop offset="55%" stopColor="#23483c" />
            <stop offset="100%" stopColor="#16342c" />
          </linearGradient>
        </defs>
        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
          <rect width={W} height={H} fill="url(#land)" />
          <rect width="210" height={H} fill="#0f241e" opacity="0.45" />
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={i * 140} y1={0} x2={i * 140} y2={H} stroke="rgba(255,255,255,0.05)" />
          ))}
          <polyline
            fill="none"
            stroke="#7eb8c9"
            strokeWidth="4"
            opacity="0.7"
            points={RIVER.map(([lat, lng]) => {
              const p = project(lat, lng);
              return `${p.x},${p.y}`;
            }).join(" ")}
          />
          <text x="70" y="80" fill="#e6c27c" fontSize="18" fontFamily="Georgia, serif">Western Ghats</text>
          <text x="430" y="250" fill="rgba(246,241,231,0.55)" fontSize="22" fontFamily="Georgia, serif">Satara</text>
          <text x="560" y="560" fill="rgba(246,241,231,0.55)" fontSize="22" fontFamily="Georgia, serif">Sangli</text>
          <text x="250" y="70" fill="rgba(246,241,231,0.45)" fontSize="16">Pune referral</text>
          {layer === "coverage" && villages.map((v) => {
            const p = project(v.lat, v.lng);
            const c = coverage(v.id);
            const fill = c > 0.85 ? "#1f8a5b" : c > 0.7 ? "#d4a017" : "#c4622d";
            return <circle key={v.id} cx={p.x} cy={p.y} r={28} fill={fill} opacity="0.35" />;
          })}
          {layer === "cases" && filtered.filter((a) => a.status === "suspected" || a.status === "confirmed").map((a) => {
            const p = project(a.lat, a.lng);
            return <circle key={`h-${a.id}`} cx={p.x} cy={p.y} r={a.riskLevel === "critical" ? 46 : 34} fill={a.status === "confirmed" ? "url(#heat-red)" : "url(#heat-amber)"} />;
          })}
          {clusters.filter((c) => c.status === "active").map((c) => {
            const p = project(c.centerLat, c.centerLng);
            return (
              <g key={c.id}>
                <circle cx={p.x} cy={p.y} r={78} fill="none" stroke="#e6c27c" strokeDasharray="6 6" strokeWidth="2" />
                <text x={p.x + 8} y={p.y - 84} fill="#e6c27c" fontSize="13">{c.title}</text>
              </g>
            );
          })}
          {villages.map((v) => {
            const p = project(v.lat, v.lng);
            return <text key={v.id} x={p.x + 8} y={p.y - 8} fill="rgba(246,241,231,0.72)" fontSize="11">{v.name}</text>;
          })}
          {facilities.map((f) => {
            const p = project(f.lat, f.lng);
            return (
              <g key={f.id}>
                <rect x={p.x - 5} y={p.y - 5} width="10" height="10" fill={f.kind === "lab" ? "#9ec5ff" : "#f6f1e7"} rx="2" />
                <text x={p.x + 8} y={p.y + 4} fill="rgba(246,241,231,0.8)" fontSize="10">{f.kind === "lab" ? "Lab" : "Vet"} · {f.name.split(",")[0]}</text>
              </g>
            );
          })}
          {farms.map((f) => {
            const p = project(f.lat, f.lng);
            return <circle key={f.id} cx={p.x} cy={p.y} r="3.5" fill="rgba(255,255,255,0.35)" />;
          })}
          {filtered.map((a) => {
            const p = project(a.lat + ((a.name.charCodeAt(0) % 5) - 2) * 0.0015, a.lng + ((a.id.charCodeAt(3) % 5) - 2) * 0.0015);
            return (
              <g key={a.id} onClick={() => setSelected(a)} style={{ cursor: "pointer" }}>
                <circle cx={p.x} cy={p.y} r={a.status === "healthy" ? 5 : 7} fill={color(a)} stroke="#f6f1e7" strokeWidth="1.2" />
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-ui bottom">
        <div className="legend">
          <span><i style={{ background: "#1f8a5b" }} />Low / healthy</span>
          <span><i style={{ background: "#d4a017" }} />Moderate</span>
          <span><i style={{ background: "#c4622d" }} />High / suspected</span>
          <span><i style={{ background: "#b42318" }} />Critical / confirmed</span>
          <span>Drag to pan · scroll to zoom</span>
        </div>
      </div>
      {selected && (
        <aside className="map-drawer">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div className="kicker">{selected.id}</div>
              <h3 style={{ margin: "4px 0" }}>{selected.name}</h3>
            </div>
            <button className="icon-btn" onClick={() => setSelected(null)}>×</button>
          </div>
          <StatusPill status={selected.status} />
          <p className="muted" style={{ fontSize: "0.9rem" }}>{selected.breed} · {selected.farmName}, {selected.villageName}, {selected.districtName}</p>
          <p>{selected.suspectedCondition ? `Possible ${selected.suspectedCondition}` : "No active syndrome"}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn-primary" href={`/console/animals/${selected.id}`}>Open digital twin</Link>
            {selected.openCaseId && <Link className="btn-line" href={`/console/cases/${selected.openCaseId}`}>Case file</Link>}
          </div>
        </aside>
      )}
    </div>
  );
}
