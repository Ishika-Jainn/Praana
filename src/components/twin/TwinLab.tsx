"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DISEASE_SPECIES, DISEASES, type DiseaseId } from "@/lib/catalog";
import { SPECIES_LIST, SPECIES_META, speciesLabel } from "@/lib/species";
import type { AnimalView, HealthStatus, RiskLevel, Species } from "@/lib/types";
import { StatusPill } from "../bits";
import { useI18n } from "../providers";
import TwinHud from "./TwinHud";

const PRESET_REGIONS: Record<DiseaseId, string[]> = {
  fmd: ["mouth", "hooves"],
  hs: ["neck", "respiratory"],
  lsd: ["skin", "neck"],
  mastitis: ["udder"],
  theileriosis: ["skin", "neck"],
  bq: ["legs"],
  ppr: ["mouth", "respiratory", "eyes"],
  asf: ["skin", "abdomen", "legs"],
  newcastle: ["respiratory", "neck", "head"],
  nonspecific: [],
};

const PRESET_SYMPTOMS: Record<DiseaseId, string[]> = {
  fmd: ["fever", "salivation"],
  hs: ["fever", "respiratory"],
  lsd: ["fever", "skin_nodules"],
  mastitis: ["udder_swelling"],
  theileriosis: ["fever", "ticks"],
  bq: ["fever", "lameness"],
  ppr: ["fever", "nasal_discharge"],
  asf: ["fever", "skin_redness"],
  newcastle: ["respiratory", "neuro_signs"],
  nonspecific: [],
};

export default function TwinLab({ animals }: { animals: AnimalView[] }) {
  const { lang } = useI18n();
  const [species, setSpecies] = useState<Species>("cattle");
  const [breed, setBreed] = useState(SPECIES_META.cattle.breeds[0]);
  const [sex, setSex] = useState<"female" | "male">("female");
  const [disease, setDisease] = useState<DiseaseId>("nonspecific");
  const meta = SPECIES_META[species];
  const diseases = (Object.keys(DISEASE_SPECIES) as DiseaseId[]).filter((d) => d !== "nonspecific" && DISEASE_SPECIES[d].includes(species));
  const affected = (PRESET_REGIONS[disease] || []).filter((r) => r !== "udder" || (sex === "female" && species !== "poultry"));
  const status: HealthStatus = disease === "nonspecific" ? "healthy" : "suspected";
  const risk: RiskLevel = disease === "nonspecific" ? "low" : disease === "asf" || disease === "fmd" ? "critical" : "high";
  const registered = useMemo(() => animals.filter((a) => a.species === species), [animals, species]);

  function pickSpecies(s: Species) {
    setSpecies(s);
    setBreed(SPECIES_META[s].breeds[0]);
    setDisease("nonspecific");
  }

  return (
    <div>
      <div className="species-tabs">
        {SPECIES_LIST.map((s) => (
          <button key={s} className={species === s ? "on" : ""} onClick={() => pickSpecies(s)}>
            <b>{speciesLabel(s, lang)}</b>
            <small>{SPECIES_META[s].group} · {animals.filter((a) => a.species === s).length} twins</small>
          </button>
        ))}
      </div>
      <div className="lab-controls">
        <label>
          Breed
          <select value={breed} onChange={(e) => setBreed(e.target.value)}>
            {meta.breeds.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <div className="seg-light">
          {(["female", "male"] as const).map((s) => (
            <button key={s} className={sex === s ? "on" : ""} onClick={() => setSex(s)}>{s === "female" ? "Female" : "Male"}</button>
          ))}
        </div>
        <div className="seg-light">
          <button className={disease === "nonspecific" ? "on" : ""} onClick={() => setDisease("nonspecific")}>Healthy baseline</button>
          {diseases.map((d) => (
            <button key={d} className={disease === d ? "on" : ""} onClick={() => setDisease(d)}>Simulate {DISEASES[d].short}</button>
          ))}
        </div>
      </div>
      <TwinHud
        key={`${species}-${breed}-${sex}`}
        species={species}
        breed={breed}
        sex={sex}
        affected={affected}
        status={status}
        risk={risk}
        symptoms={PRESET_SYMPTOMS[disease]}
        title={`${breed} ${speciesLabel(species, "en").toLowerCase()}`}
        subtitle={disease === "nonspecific" ? "Reference twin · healthy baseline" : `Simulated pattern · possible ${DISEASES[disease].name}`}
        height={720}
      />
      <section className="panel panel-pad" style={{ marginTop: 16 }}>
        <p className="kicker">Registered {speciesLabel(species, lang)} twins</p>
        {registered.length === 0 && <p className="muted">No {speciesLabel(species, lang).toLowerCase()} registered yet. Use the registration desk to add one.</p>}
        <div className="grid-3" style={{ marginTop: 10 }}>
          {registered.map((a) => (
            <Link key={a.id} href={`/console/animals/${a.id}`} className="animal-card">
              <div className="animal-top">
                <div>
                  <strong>{a.name}</strong>
                  <div className="faint" style={{ fontSize: "0.78rem" }}>{a.id} · {a.breed}</div>
                </div>
                <StatusPill status={a.status} />
              </div>
              <span className="faint" style={{ fontSize: "0.8rem" }}>{a.farmName} · {a.villageName}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
