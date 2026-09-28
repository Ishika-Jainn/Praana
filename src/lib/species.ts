import type { HealthStatus, Lang, RiskLevel, Species } from "./types";

type Pack = { en: string; hi: string; mr: string };

export const SPECIES_LIST: Species[] = ["cattle", "buffalo", "goat", "sheep", "pig", "camel", "poultry"];

export const SPECIES_META: Record<
  Species,
  {
    label: Pack;
    group: string;
    breeds: string[];
    vaccines: string[];
    ruminant: boolean;
    vitals: { temp: [number, number]; hr: [number, number]; rr: [number, number] };
    fourth: { label: string; unit: string; normal: [number, number] };
  }
> = {
  cattle: {
    label: { en: "Cattle", hi: "गाय / बैल", mr: "गाय / बैल" },
    group: "Bovine",
    breeds: ["Gir", "Khillar", "Deoni", "Sahiwal", "HF cross", "Jersey cross", "Non-descript"],
    vaccines: ["FMD", "HS", "BQ", "LSD"],
    ruminant: true,
    vitals: { temp: [38.0, 39.3], hr: [48, 84], rr: [26, 50] },
    fourth: { label: "Rumination", unit: "h/day", normal: [7, 9] },
  },
  buffalo: {
    label: { en: "Buffalo", hi: "भैंस", mr: "म्हैस" },
    group: "Bubaline",
    breeds: ["Murrah", "Pandharpuri", "Mehsana", "Jaffarabadi"],
    vaccines: ["FMD", "HS", "BQ"],
    ruminant: true,
    vitals: { temp: [37.5, 39.0], hr: [40, 60], rr: [18, 30] },
    fourth: { label: "Rumination", unit: "h/day", normal: [7, 9] },
  },
  goat: {
    label: { en: "Goat", hi: "बकरी", mr: "शेळी" },
    group: "Caprine",
    breeds: ["Osmanabadi", "Sangamneri", "Beetal", "Black Bengal"],
    vaccines: ["PPR", "FMD", "ET", "Goat pox"],
    ruminant: true,
    vitals: { temp: [38.5, 40.0], hr: [70, 90], rr: [15, 30] },
    fourth: { label: "Rumination", unit: "h/day", normal: [6, 8] },
  },
  sheep: {
    label: { en: "Sheep", hi: "भेड़", mr: "मेंढी" },
    group: "Ovine",
    breeds: ["Deccani", "Madgyal", "Nellore"],
    vaccines: ["PPR", "FMD", "ET", "Sheep pox"],
    ruminant: true,
    vitals: { temp: [38.5, 40.0], hr: [70, 90], rr: [16, 34] },
    fourth: { label: "Rumination", unit: "h/day", normal: [6, 8] },
  },
  pig: {
    label: { en: "Pig", hi: "सुअर", mr: "डुक्कर" },
    group: "Porcine",
    breeds: ["Large White Yorkshire", "LWY cross", "Ghungroo"],
    vaccines: ["CSF", "FMD"],
    ruminant: false,
    vitals: { temp: [38.7, 39.8], hr: [70, 120], rr: [13, 24] },
    fourth: { label: "Activity", unit: "%", normal: [60, 90] },
  },
  camel: {
    label: { en: "Camel", hi: "ऊँट", mr: "उंट" },
    group: "Camelid",
    breeds: ["Marwari", "Bikaneri", "Jaisalmeri"],
    vaccines: ["Camelpox"],
    ruminant: false,
    vitals: { temp: [36.0, 38.5], hr: [40, 50], rr: [5, 12] },
    fourth: { label: "Rumination", unit: "h/day", normal: [6, 8] },
  },
  poultry: {
    label: { en: "Poultry", hi: "मुर्गी", mr: "कोंबडी" },
    group: "Avian",
    breeds: ["Kadaknath", "Giriraja", "Aseel", "White Leghorn"],
    vaccines: ["RD (Ranikhet)", "IBD", "Marek's"],
    ruminant: false,
    vitals: { temp: [40.6, 41.7], hr: [250, 300], rr: [15, 36] },
    fourth: { label: "Activity", unit: "%", normal: [60, 90] },
  },
};

export function speciesLabel(species: string, lang: Lang = "en") {
  const meta = SPECIES_META[species as Species];
  if (!meta) return species;
  return meta.label[lang] || meta.label.en;
}

const ALL_REGIONS = ["head", "eyes", "mouth", "neck", "respiratory", "skin", "abdomen", "udder", "legs", "hooves"];

export function regionsFor(species: string, sex: string = "female") {
  return ALL_REGIONS.filter((r) => {
    if (r !== "udder") return true;
    if (species === "poultry") return false;
    return sex === "female";
  });
}

const OVERRIDES: Record<string, Record<string, Pack>> = {
  poultry: {
    mouth: { en: "Beak", hi: "चोंच", mr: "चोच" },
    hooves: { en: "Feet", hi: "पंजे", mr: "पाय / नखे" },
    skin: { en: "Feathers / skin", hi: "पंख / त्वचा", mr: "पिसे / त्वचा" },
    abdomen: { en: "Abdomen / vent", hi: "पेट / मलद्वार", mr: "पोट / गुदद्वार" },
    legs: { en: "Shanks", hi: "टाँगें", mr: "पाय" },
  },
  pig: { hooves: { en: "Trotters", hi: "खुर", mr: "खुर" }, mouth: { en: "Snout / mouth", hi: "थूथन / मुँह", mr: "नाक / तोंड" } },
  camel: { hooves: { en: "Foot pads", hi: "पैर के गद्दे", mr: "पायाचे तळवे" } },
  sheep: { skin: { en: "Fleece / skin", hi: "ऊन / त्वचा", mr: "लोकर / त्वचा" } },
};

export function regionOverride(species: string, region: string, lang: Lang): string | null {
  const o = OVERRIDES[species]?.[region];
  return o ? o[lang] || o.en : null;
}

export type Vital = { key: string; label: string; unit: string; value: number | null; normal: [number, number]; state: "normal" | "high" | "low" | "none" };

export function estimateVitals(
  species: string,
  status: HealthStatus,
  risk: RiskLevel,
  symptoms: string[],
): Vital[] {
  const meta = SPECIES_META[species as Species] || SPECIES_META.cattle;
  const { temp, hr, rr } = meta.vitals;
  const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
  if (status === "deceased") {
    return [
      { key: "temp", label: "Body temperature", unit: "°C", value: null, normal: temp, state: "none" },
      { key: "hr", label: "Heart rate", unit: "bpm", value: null, normal: hr, state: "none" },
      { key: "rr", label: "Respiration", unit: "/min", value: null, normal: rr, state: "none" },
      { key: "x", label: meta.fourth.label, unit: meta.fourth.unit, value: null, normal: meta.fourth.normal, state: "none" },
    ];
  }
  const sick = status === "suspected" || status === "confirmed";
  const fever = symptoms.includes("fever") || (sick && (risk === "high" || risk === "critical"));
  const resp = symptoms.includes("respiratory") || symptoms.includes("nasal_discharge");
  const t = fever ? temp[1] + 0.9 : status === "observation" ? temp[1] - 0.1 : status === "recovering" ? mid(temp) + 0.3 : mid(temp);
  const h = fever ? hr[1] * 1.18 : status === "recovering" ? mid(hr) * 1.06 : mid(hr);
  const r = resp || fever ? rr[1] * 1.3 : mid(rr);
  const x = sick ? meta.fourth.normal[0] * 0.55 : status === "observation" ? meta.fourth.normal[0] * 0.9 : mid(meta.fourth.normal);
  const state = (v: number, n: [number, number]) => (v > n[1] ? "high" : v < n[0] ? "low" : "normal") as Vital["state"];
  return [
    { key: "temp", label: "Body temperature", unit: "°C", value: Math.round(t * 10) / 10, normal: temp, state: state(t, temp) },
    { key: "hr", label: "Heart rate", unit: "bpm", value: Math.round(h), normal: hr, state: state(h, hr) },
    { key: "rr", label: "Respiration", unit: "/min", value: Math.round(r), normal: rr, state: state(r, rr) },
    { key: "x", label: meta.fourth.label, unit: meta.fourth.unit, value: Math.round(x * 10) / 10, normal: meta.fourth.normal, state: state(x, meta.fourth.normal) },
  ];
}

export function healthIndex(status: HealthStatus, risk: RiskLevel) {
  const base: Record<HealthStatus, number> = { healthy: 94, observation: 76, suspected: 54, confirmed: 32, recovering: 70, deceased: 0 };
  const pen: Record<RiskLevel, number> = { low: 0, moderate: 4, high: 9, critical: 14 };
  return Math.max(0, base[status] - (status === "deceased" ? 0 : pen[risk]));
}
