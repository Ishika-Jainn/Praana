import { DISEASES, DISEASE_SPECIES, type DiseaseId } from "./catalog";
import type { RiskLevel, TriageInput, TriageResult } from "./types";

const WEIGHTS: Record<DiseaseId, { symptoms: Record<string, number>; regions: Record<string, number> }> = {
  fmd: {
    symptoms: {
      salivation: 3,
      mouth_lesions: 3,
      hoof_lesions: 3,
      lameness: 2,
      fever: 1,
      anorexia: 1,
      milk_drop: 1,
      depression: 1,
    },
    regions: { mouth: 2, hooves: 2, legs: 1, head: 1 },
  },
  hs: {
    symptoms: {
      fever: 2,
      respiratory: 3,
      throat_swelling: 3,
      depression: 1,
      anorexia: 1,
      recumbency: 1,
    },
    regions: { neck: 2, respiratory: 2, head: 1 },
  },
  lsd: {
    symptoms: { skin_nodules: 4, fever: 1, milk_drop: 1, nasal_discharge: 1, anorexia: 1 },
    regions: { skin: 3, neck: 1, head: 1 },
  },
  mastitis: {
    symptoms: { udder_swelling: 4, abnormal_milk: 3, milk_drop: 1, fever: 1 },
    regions: { udder: 3 },
  },
  theileriosis: {
    symptoms: { ticks: 3, lymph_nodes: 3, fever: 2, weight_loss: 1, depression: 1, anemia: 2 },
    regions: { skin: 1, neck: 1 },
  },
  bq: {
    symptoms: { muscle_swelling: 4, lameness: 2, fever: 2, recumbency: 1, depression: 1 },
    regions: { legs: 2, skin: 1 },
  },
  ppr: {
    symptoms: { fever: 2, nasal_discharge: 3, mouth_lesions: 2, diarrhea: 3, respiratory: 2, anorexia: 1, depression: 1 },
    regions: { mouth: 2, respiratory: 2, eyes: 1, abdomen: 1 },
  },
  asf: {
    symptoms: { fever: 3, skin_redness: 4, recumbency: 2, anorexia: 1, depression: 1, diarrhea: 1, respiratory: 1 },
    regions: { skin: 2, abdomen: 1, legs: 1 },
  },
  newcastle: {
    symptoms: { respiratory: 3, neuro_signs: 4, diarrhea: 2, egg_drop: 3, depression: 1, nasal_discharge: 1 },
    regions: { respiratory: 2, neck: 2, head: 1 },
  },
  nonspecific: { symptoms: {}, regions: {} },
};

function riskFrom(score: number, nearby: number, mortality: number): RiskLevel {
  const clusterPressure = nearby >= 3 || (mortality > 0 && score >= 6);
  if (score >= 12 || (score >= 8 && clusterPressure)) return "critical";
  if (score >= 8) return nearby >= 1 ? "critical" : "high";
  if (score >= 6) return "high";
  if (score >= 4) return "moderate";
  return "low";
}

export function assessRisk(input: TriageInput): TriageResult {
  const symptoms = new Set(input.symptoms);
  const regions = new Set([...input.regions, ...input.photoRegions]);
  const scores: { diseaseId: DiseaseId; score: number }[] = [];

  (Object.keys(WEIGHTS) as DiseaseId[])
    .filter((id) => id !== "nonspecific" && DISEASE_SPECIES[id].includes(String(input.species)))
    .forEach((id) => {
      const w = WEIGHTS[id];
      let score = 0;
      for (const [k, v] of Object.entries(w.symptoms)) if (symptoms.has(k)) score += v;
      for (const [k, v] of Object.entries(w.regions)) if (regions.has(k)) score += v;
      if (input.photoRegions.some((r) => w.regions[r])) score += 1;
      const vaccine = DISEASES[id].vaccine;
      if (vaccine) {
        if (!input.vaccinatedAgainst.includes(vaccine)) score += 1;
      }
      if (input.history.includes(id)) score += 1;
      if (id === "fmd" || id === "hs" || id === "lsd" || id === "ppr" || id === "asf" || id === "newcastle") {
        if (input.nearbySame >= 5) score += 3;
        else if (input.nearbySame >= 2) score += 2;
        else if (input.nearbySame >= 1) score += 1;
      }
      if ((id === "fmd" || id === "hs") && input.humidity >= 70) score += 1;
      if ((id === "fmd" || id === "bq") && input.rainfallMm >= 8) score += 1;
      if (id === "hs" && input.nearbyMortality > 0) score += 2;
      if (input.species === "buffalo" && id === "hs") score += 1;
      scores.push({ diseaseId: id, score });
    });

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1]?.score ?? 0;
  const diseaseId: DiseaseId = top && top.score >= 4 ? top.diseaseId : "nonspecific";
  const disease = DISEASES[diseaseId];
  const score = diseaseId === "nonspecific" ? top?.score ?? 0 : top.score;
  const riskLevel = diseaseId === "nonspecific" ? (score >= 2 ? "moderate" : "low") : riskFrom(score, input.nearbySame, input.nearbyMortality);
  const confidence =
    diseaseId === "nonspecific" ? "low" : score - second >= 3 && score >= 8 ? "high" : score >= 6 ? "moderate" : "low";

  const evidenceCodes: string[] = [];
  for (const s of input.symptoms) evidenceCodes.push(`symptom:${s}`);
  for (const r of input.regions) evidenceCodes.push(`region:${r}`);
  for (const r of input.photoRegions) if (!input.regions.includes(r)) evidenceCodes.push(`photo:${r}`);
  if (input.nearbySame >= 1) evidenceCodes.push("nearby");
  if (input.nearbyMortality > 0) evidenceCodes.push("mortality");
  if (input.humidity >= 70 || input.rainfallMm >= 8) evidenceCodes.push("weather");
  const vaccine = disease.vaccine;
  if (vaccine && input.vaccinatedAgainst.includes(vaccine)) evidenceCodes.push("vax_recent");
  if (vaccine && !input.vaccinatedAgainst.includes(vaccine)) evidenceCodes.push("vax_gap");
  if (input.history.includes(diseaseId)) evidenceCodes.push("history");

  const evidence = evidenceCodes.map((code) => {
    if (code === "nearby") return `${input.nearbySame} similar report${input.nearbySame === 1 ? "" : "s"} within 5 km`;
    if (code === "weather") return `Humidity ${input.humidity}% and ${input.rainfallMm} mm recent rain — environmental persistence more likely`;
    if (code === "mortality") return "Recent mortality reported in the same belt";
    if (code === "vax_recent") return `${vaccine} vaccination is on record — risk is reduced, not removed`;
    if (code === "vax_gap") return `${vaccine} vaccination is overdue or not on record`;
    if (code === "history") return "Related condition exists in this animal's history";
    if (code.startsWith("symptom:")) {
      const id = code.split(":")[1];
      return id.replaceAll("_", " ");
    }
    if (code.startsWith("region:")) return `${code.split(":")[1]} marked on the digital twin`;
    if (code.startsWith("photo:")) return `Photograph tagged to ${code.split(":")[1]}`;
    return code;
  });

  const bumped: RiskLevel =
    diseaseId === "fmd" && input.nearbySame >= 3 && (riskLevel === "high" || riskLevel === "moderate")
      ? "critical"
      : riskLevel;

  return {
    diseaseId,
    possibleCondition: disease.name,
    localName: disease.hi,
    riskLevel: diseaseId === "nonspecific" ? riskLevel : bumped,
    confidence,
    evidence,
    evidenceCodes,
    nextSteps: disease.steps.map((id) => {
      const text: Record<string, string> = {
        isolate: "Isolate the animal",
        do_not_move: "Stop movement to markets and fairs",
        call_vet: "Contact veterinarian",
        sample: "Arrange sample collection",
        monitor_nearby: "Monitor nearby animals",
        notify_authority: "Notify the surveillance desk",
        supportive_care: "Give shade, water and soft feed",
        udder_hygiene: "Milk last and discard abnormal milk",
        tick_control: "Inspect and control ticks after advice",
        shade_rest: "Rest the animal; do not massage swollen muscle",
        separate_milk: "Keep milk out of the bulk tank",
      };
      return text[id] || id;
    }),
    nextStepIds: disease.steps,
    disclaimer:
      "Possible / suspected pattern only. This rule-based triage is decision support for field teams and is not a diagnosis.",
    scores: scores.slice(0, 4).map((s) => ({ diseaseId: s.diseaseId, score: s.score })),
    weatherNote:
      input.humidity >= 70
        ? "Warm humidity and yard moisture are being treated as supporting risk factors, not proof of disease."
        : undefined,
  };
}

export function parseVoice(transcript: string) {
  const text = transcript.toLowerCase();
  const symptoms = new Set<string>();
  const regions = new Set<string>();
  const rules: { test: RegExp; symptom?: string; region?: string }[] = [
    { test: /bukhar|bukhaar|fever|ताप|बुखार|ज्वर|taap/, symptom: "fever" },
    { test: /khana nahi|nahi kha|not eating|appetite|भूख|खात नाही|खात नाही|खाना नहीं|bhook|ann na/, symptom: "anorexia" },
    { test: /laar|lalar|saliva|salivation|लार|लाळ|लाळ/, symptom: "salivation", region: "mouth" },
    { test: /muh|munh|mouth|तोंड|मुँह|मुंह|chhale|vesicle|lesion|फोड|छाले/, symptom: "mouth_lesions", region: "mouth" },
    { test: /khur|hoof|foot|खुर|langda|langdi|लंगड|लंगड़|walking|chal nahi|चालत नाही/, symptom: "lameness", region: "hooves" },
    { test: /khur.*ghav|hoof lesion|खुरां|खुर के/, symptom: "hoof_lesions", region: "hooves" },
    { test: /doodh|dudh|milk|दूध|दुध/, symptom: "milk_drop" },
    { test: /saas|saans|breath|respirat|श्वास|सांस|धाप/, symptom: "respiratory", region: "respiratory" },
    { test: /gala|galaa|throat|neck swell|गला|गलघों|मान सुज|गर्दन/, symptom: "throat_swelling", region: "neck" },
    { test: /ganth|nodule|skin|त्वचा|गाठ|lumpy|लम्पी/, symptom: "skin_nodules", region: "skin" },
    { test: /than|udder|कास|थन/, symptom: "udder_swelling", region: "udder" },
    { test: /kilni|tick|gochid|गोचिड|किलनी|किल्नी/, symptom: "ticks", region: "skin" },
    { test: /dast|diarrhea|loose motion|जुलाब|दस्त/, symptom: "diarrhea", region: "abdomen" },
    { test: /khada nahi|unable to stand|recumb|उभा राहत|खड़ा नहीं/, symptom: "recumbency" },
    { test: /sooj|soojan|swelling|सूज/, symptom: "muscle_swelling", region: "legs" },
    { test: /naak|nasal|नाक|shembud|शेंबूड/, symptom: "nasal_discharge", region: "respiratory" },
    { test: /lal dhabb|red patch|redness|लाल/, symptom: "skin_redness", region: "skin" },
    { test: /gardan mud|twisted neck|tremor|गर्दन मुड|मान वाक/, symptom: "neuro_signs", region: "neck" },
    { test: /anda|egg|अंडा|अंडी/, symptom: "egg_drop" },
  ];
  for (const rule of rules) {
    if (rule.test.test(text) || rule.test.test(transcript)) {
      if (rule.symptom) symptoms.add(rule.symptom);
      if (rule.region) regions.add(rule.region);
    }
  }
  if (/langda|लंगड|लंगड़|difficulty walking/.test(text) && /khur|hoof|खुर/.test(text)) {
    symptoms.add("hoof_lesions");
    regions.add("hooves");
  }
  return {
    symptoms: [...symptoms],
    regions: [...regions],
  };
}
