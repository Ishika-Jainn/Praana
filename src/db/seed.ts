import { eq, sql } from "drizzle-orm";
import { db, ensureMigrated } from "@/db";
import {
  alerts,
  animals,
  blocks,
  cases,
  clusters,
  diseaseTrends,
  districts,
  facilities,
  farms,
  labSamples,
  mediaAssets,
  mortalityEvents,
  reports,
  timelineEvents,
  treatments,
  users,
  vaccinations,
  vetReports,
  villages,
  weatherReadings,
} from "@/db/schema";
import { DISEASES, type DiseaseId } from "@/lib/catalog";
import { daysAgo } from "@/lib/format";
import type { RiskLevel, TriageResult } from "@/lib/types";
import { refreshClusters } from "@/lib/workflow";
import { SPECIES_META } from "@/lib/species";
import { DEMO_PASSWORD, hashPassword } from "@/lib/auth";

let seq = 0;
function nid(prefix: string) {
  seq += 1;
  return `${prefix}-${seq.toString(36)}`;
}

function plate(title: string, kicker: string, tone: string, marks: number) {
  const dots = Array.from({ length: marks }, (_, i) => {
    const x = 168 + (i % 5) * 34;
    const y = 230 + Math.floor(i / 5) * 26;
    return `<ellipse cx="${x}" cy="${y}" rx="11" ry="7" fill="${tone}" opacity="0.85"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
    <rect width="960" height="600" fill="#efe6d8"/>
    <rect x="36" y="32" width="888" height="536" rx="28" fill="#fffaf4" stroke="#e3d5c0"/>
    <text x="64" y="84" font-family="Georgia, serif" font-size="13" letter-spacing="3" fill="#8d6236">${kicker}</text>
    <text x="64" y="126" font-family="Georgia, serif" font-size="34" fill="#1b2a24">${title}</text>
    <path d="M150 200c70-40 210-46 280-8 54 30 70 78 40 112-38 44-160 62-250 40-78-18-120-70-70-144z" fill="#f0d2c2" stroke="#b98a76"/>
    <path d="M250 250c40 10 90 8 120-8" fill="none" stroke="#a87564" stroke-width="3"/>
    ${dots}
    <text x="64" y="500" font-family="Arial, sans-serif" font-size="14" fill="#66756d">Schematic clinical plate for longitudinal comparison. Not a laboratory diagnosis.</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function triage(diseaseId: DiseaseId, risk: RiskLevel, evidence: string[]): TriageResult {
  const d = DISEASES[diseaseId];
  return {
    diseaseId,
    possibleCondition: d.name,
    localName: d.hi,
    riskLevel: risk,
    confidence: risk === "critical" || risk === "high" ? "high" : "moderate",
    evidence,
    evidenceCodes: evidence.map((_, i) => `note:${i}`),
    nextSteps: d.steps,
    nextStepIds: d.steps,
    disclaimer: "Possible / suspected pattern only. This rule-based triage is decision support for field teams and is not a diagnosis.",
    scores: [
      { diseaseId, score: risk === "critical" ? 18 : risk === "high" ? 12 : 6 },
      { diseaseId: "nonspecific", score: 2 },
    ],
    weatherNote: "Humidity and yard moisture are supporting context, not proof.",
  };
}

const districtRows = [
  { id: "d-satara", name: "Satara", state: "Maharashtra", lat: 17.68, lng: 74.02 },
  { id: "d-sangli", name: "Sangli", state: "Maharashtra", lat: 16.86, lng: 74.56 },
];

const blockRows = [
  { id: "b-karad", districtId: "d-satara", name: "Karad", lat: 17.289, lng: 74.2 },
  { id: "b-koregaon", districtId: "d-satara", name: "Koregaon", lat: 17.7, lng: 74.16 },
  { id: "b-phaltan", districtId: "d-satara", name: "Phaltan", lat: 17.99, lng: 74.43 },
  { id: "b-tasgaon", districtId: "d-sangli", name: "Tasgaon", lat: 17.03, lng: 74.6 },
  { id: "b-miraj", districtId: "d-sangli", name: "Miraj", lat: 16.83, lng: 74.64 },
];

const villageRows = [
  { id: "v-kalevadi", blockId: "b-karad", name: "Kalevadi", lat: 17.289, lng: 74.184, households: 214 },
  { id: "v-malwadi", blockId: "b-karad", name: "Malwadi", lat: 17.306, lng: 74.201, households: 96 },
  { id: "v-rethare", blockId: "b-karad", name: "Rethare Bk.", lat: 17.274, lng: 74.166, households: 180 },
  { id: "v-umbraj", blockId: "b-karad", name: "Umbraj", lat: 17.398, lng: 74.118, households: 640 },
  { id: "v-vaduj", blockId: "b-koregaon", name: "Vaduj", lat: 17.623, lng: 74.286, households: 890 },
  { id: "v-aundh", blockId: "b-koregaon", name: "Aundh", lat: 17.546, lng: 74.375, households: 410 },
  { id: "v-pusesavali", blockId: "b-phaltan", name: "Pusesavali", lat: 17.918, lng: 74.401, households: 520 },
  { id: "v-tasgaon", blockId: "b-tasgaon", name: "Tasgaon", lat: 17.037, lng: 74.601, households: 1200 },
  { id: "v-kavlapur", blockId: "b-miraj", name: "Kavlapur", lat: 16.852, lng: 74.582, households: 260 },
];

const farmRows = [
  { id: "f-patil", villageId: "v-kalevadi", name: "Patil Dairy", ownerName: "Meera Patil", ownerPhone: "+91 98220 11421", lat: 17.2915, lng: 74.1865 },
  { id: "f-shinde", villageId: "v-kalevadi", name: "Shinde Farm", ownerName: "Suresh Shinde", ownerPhone: "+91 98814 22018", lat: 17.2848, lng: 74.1912 },
  { id: "f-jadhav", villageId: "v-malwadi", name: "Jadhav Farm", ownerName: "Anita Jadhav", ownerPhone: "+91 97654 33012", lat: 17.3042, lng: 74.1994 },
  { id: "f-more", villageId: "v-rethare", name: "More Buffalo Unit", ownerName: "Prakash More", ownerPhone: "+91 99221 77810", lat: 17.2755, lng: 74.1688 },
  { id: "f-umbraj", villageId: "v-umbraj", name: "Umbraj Coop Shed", ownerName: "Co-op Secretary", ownerPhone: "+91 98900 44112", lat: 17.3992, lng: 74.1194 },
  { id: "f-kale", villageId: "v-vaduj", name: "Kale Khillar Unit", ownerName: "Harish Kale", ownerPhone: "+91 98500 22119", lat: 17.6244, lng: 74.2871 },
  { id: "f-pawar", villageId: "v-aundh", name: "Pawar Farm", ownerName: "Lata Pawar", ownerPhone: "+91 97631 88021", lat: 17.5472, lng: 74.3764 },
  { id: "f-deshmukh", villageId: "v-pusesavali", name: "Deshmukh Farm", ownerName: "Nitin Deshmukh", ownerPhone: "+91 98230 11990", lat: 17.9194, lng: 74.4022 },
  { id: "f-tasgaon", villageId: "v-tasgaon", name: "Patil Buffalo Shed", ownerName: "Sunita Patil", ownerPhone: "+91 98812 66440", lat: 17.0388, lng: 74.6024 },
  { id: "f-joshi", villageId: "v-kavlapur", name: "Joshi Crossbreds", ownerName: "Rahul Joshi", ownerPhone: "+91 99701 55218", lat: 16.8536, lng: 74.5833 },
  { id: "f-kamble", villageId: "v-aundh", name: "Kamble Goat Unit", ownerName: "Sangeeta Kamble", ownerPhone: "+91 97302 44871", lat: 17.5493, lng: 74.3712 },
  { id: "f-dhangar", villageId: "v-pusesavali", name: "Dhangar Transhumant Camp", ownerName: "Bhiku Gawade", ownerPhone: "+91 94221 60935", lat: 17.9231, lng: 74.3968 },
  { id: "f-gaikwad", villageId: "v-kavlapur", name: "Gaikwad Piggery", ownerName: "Amol Gaikwad", ownerPhone: "+91 98607 31184", lat: 16.8497, lng: 74.5871 },
  { id: "f-sawant", villageId: "v-rethare", name: "Sawant Backyard Poultry", ownerName: "Rekha Sawant", ownerPhone: "+91 97655 20947", lat: 17.2731, lng: 74.1642 },
];

type AnimalSeed = {
  id: string;
  name: string;
  species: "cattle" | "buffalo" | "goat" | "sheep" | "pig" | "camel" | "poultry";
  breed: string;
  sex: "female" | "male";
  age: number;
  weight: number;
  farm: string;
  status: string;
  risk: RiskLevel;
  suspected?: string;
  confirmed?: string;
  regions?: string[];
  symptoms?: string[];
  milk?: number;
  pregnant?: boolean;
  diseaseId?: DiseaseId;
  voice?: string;
  severity?: string;
  duration?: string;
  case?: { id: string; code: string; status: string; opened: number; closed?: number; summary: string };
  sample?: { id: string; code: string; type: string; test: string; status: string; result?: string; note?: string; collected: number; resultDays?: number; lab?: string };
  treatment?: { medicine: string; dosage: string; frequency: string; start: number; days: number; response: string; status: string; follow?: number };
  vet?: { findings: string; dx: string; rec: string; days: number };
  mortality?: { cause: string; notes: string; days: number };
  evidence?: string[];
};

const animalSeeds: AnimalSeed[] = [
  {
    id: "MH-SAT-00421", name: "Gauri", species: "cattle", breed: "Gir", sex: "female", age: 54, weight: 412, farm: "f-patil",
    status: "suspected", risk: "high", suspected: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["mouth", "hooves"], symptoms: ["fever", "anorexia", "salivation", "mouth_lesions", "hoof_lesions", "lameness", "milk_drop"],
    milk: 8.4, severity: "severe", duration: "2 days",
    voice: "Gauri ko bukhar hai, muh se laar aa rahi hai, khana nahi kha rahi aur langda kar rahi hai.",
    evidence: ["Excessive salivation", "Mouth lesions photographed", "Hoof lesions and lameness", "Similar reports within 5 km", "Humidity 78% in Kalevadi"],
    case: { id: "c-gauri", code: "CASE-2026-00421", status: "sampled", opened: 5, summary: "Index shed report. Salivation, oral vesicles and coronary-band pain. Sample is in testing." },
    sample: { id: "s-gauri", code: "SMP-2026-1184", type: "Oral and coronary epithelium", test: "FMD antigen ELISA + serotyping PCR", status: "testing", collected: 4, lab: "District Disease Investigation Lab, Satara" },
    vet: { findings: "40.1°C. Ruptured vesicles on the dental pad and tongue. Coronary band hyperaemia on both forefeet. Ropey salivation. Two in-contacts dull and off feed.", dx: "Foot-and-mouth disease", rec: "Isolate. Soft feed and shade. No market movement. Continue lab follow-up and examine the rest of the shed.", days: 4 },
  },
  {
    id: "MH-SAT-00422", name: "Lakshmi", species: "cattle", breed: "Gir", sex: "female", age: 42, weight: 386, farm: "f-patil",
    status: "healthy", risk: "low", milk: 11.2, pregnant: true, regions: [],
  },
  {
    id: "MH-SAT-00423", name: "Ganga", species: "cattle", breed: "Gir", sex: "female", age: 36, weight: 368, farm: "f-patil",
    status: "suspected", risk: "high", suspected: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["mouth", "hooves"], symptoms: ["fever", "salivation", "anorexia", "lameness", "milk_drop"], milk: 6.1,
    severity: "moderate", duration: "1 day",
    evidence: ["Salivation and fever", "Same shed as Gauri", "Lameness beginning"],
    case: { id: "c-ganga", code: "CASE-2026-00419", status: "examined", opened: 3, summary: "In-contact to Gauri. Early oral discomfort and dropping milk." },
    vet: { findings: "39.8°C. Intact vesicles on the tongue. Mild coronary hyperaemia. Still walking, but short-strided.", dx: "Foot-and-mouth disease", rec: "Isolate with Gauri. Sample if lesions rupture. Daily in-contact check.", days: 2 },
  },
  {
    id: "MH-SAT-00424", name: "Revati", species: "cattle", breed: "Gir", sex: "female", age: 29, weight: 334, farm: "f-patil",
    status: "suspected", risk: "high", suspected: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["mouth"], symptoms: ["salivation", "anorexia", "fever"], milk: 7.4, severity: "moderate", duration: "1 day",
    evidence: ["Salivation", "Off feed", "Index shed"],
    case: { id: "c-revati", code: "CASE-2026-00428", status: "triaged", opened: 1, summary: "New in-contact. Owner noticed drooling this morning." },
  },
  {
    id: "MH-SAT-00102", name: "Kamdhenu", species: "cattle", breed: "HF cross", sex: "female", age: 62, weight: 498, farm: "f-patil",
    status: "recovering", risk: "moderate", suspected: "Mastitis", diseaseId: "mastitis",
    regions: ["udder"], symptoms: ["udder_swelling", "abnormal_milk", "milk_drop"], milk: 14.5,
    evidence: ["Swollen right hind quarter", "Flakes in milk", "Fever resolved"],
    case: { id: "c-kam", code: "CASE-2026-00340", status: "treated", opened: 12, summary: "Clinical mastitis, right hind quarter. Responding to intramammary therapy." },
    treatment: { medicine: "Cefoperazone intramammary", dosage: "1 syringe / affected quarter", frequency: "Once daily after milking", start: 11, days: 5, response: "Swelling reduced, milk clearing", status: "active", follow: -1 },
    vet: { findings: "Hot, painful right hind quarter. Milk with flakes. Temperature now normal.", dx: "Mastitis", rec: "Complete the course. Milk last. Discard treated milk.", days: 11 },
    sample: { id: "s-kam", code: "SMP-2026-1102", type: "Milk", test: "Culture and sensitivity", status: "result_available", result: "positive", note: "Streptococcus uberis, sensitive to the chosen intramammary.", collected: 11, resultDays: 8 },
  },
  {
    id: "MH-SAT-00428", name: "Nandi", species: "cattle", breed: "Gir", sex: "male", age: 48, weight: 524, farm: "f-patil",
    status: "observation", risk: "moderate", suspected: "Hoof crack", diseaseId: "nonspecific",
    regions: ["hooves"], symptoms: ["lameness"], severity: "mild", duration: "6 days",
    evidence: ["Single hoof crack", "No oral lesions", "Shed is under FMD watch so lameness cannot be ignored"],
    case: { id: "c-nandi", code: "CASE-2026-00411", status: "examined", opened: 6, summary: "Hoof crack. Kept under observation because the shed has an FMD pattern." },
    vet: { findings: "Vertical crack on lateral claw, left fore. Mouth, tongue and other coronary bands clear.", dx: "Hoof crack", rec: "Pare and dress. Re-examine if a second foot or the mouth becomes involved.", days: 5 },
  },
  {
    id: "MH-SAT-00430", name: "Radha", species: "cattle", breed: "Khillar", sex: "female", age: 40, weight: 355, farm: "f-shinde",
    status: "confirmed", risk: "critical", suspected: "Foot-and-mouth disease", confirmed: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["mouth", "hooves", "legs"], symptoms: ["fever", "salivation", "mouth_lesions", "hoof_lesions", "lameness", "anorexia", "milk_drop"],
    milk: 4.2, severity: "severe", duration: "4 days",
    evidence: ["Laboratory positive, serotype O", "Oral and hoof lesions", "Neighbouring Patil Dairy affected"],
    case: { id: "c-radha", code: "CASE-2026-00418", status: "treated", opened: 7, summary: "Confirmed FMD serotype O. Treatment and isolation in progress. Index confirmation for the Kalevadi cluster." },
    sample: { id: "s-radha", code: "SMP-2026-1176", type: "Oral epithelium", test: "FMD antigen ELISA + serotyping", status: "result_available", result: "positive", note: "Serotype O. RDDL Pune concurred.", collected: 6, resultDays: 2, lab: "District Disease Investigation Lab, Satara" },
    vet: { findings: "Confirmed clinically and by antigen ELISA. Painful on all four feet. Isolated at the east end of the shed.", dx: "Foot-and-mouth disease", rec: "Continue supportive care. No movement. Vaccination ring to be planned by the district desk.", days: 6 },
    treatment: { medicine: "Flunixin meglumine + supportive oral care", dosage: "1.1 mg/kg IM", frequency: "Once daily", start: 2, days: 4, response: "Eating soaked fodder. Still salivating.", status: "active", follow: -1 },
  },
  {
    id: "MH-SAT-00431", name: "Chhaya", species: "cattle", breed: "Khillar", sex: "female", age: 28, weight: 308, farm: "f-shinde",
    status: "suspected", risk: "high", suspected: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["mouth", "hooves"], symptoms: ["salivation", "lameness", "fever", "anorexia"], milk: 5.5, severity: "moderate", duration: "1 day",
    evidence: ["Same farm as confirmed Radha", "Early salivation"],
    case: { id: "c-chhaya", code: "CASE-2026-00422", status: "assigned", opened: 1, summary: "In-contact to a confirmed animal. Examination scheduled today." },
  },
  {
    id: "MH-SAT-00432", name: "Moti", species: "cattle", breed: "Khillar", sex: "female", age: 14, weight: 186, farm: "f-shinde",
    status: "suspected", risk: "high", suspected: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["mouth"], symptoms: ["fever", "salivation", "anorexia"], milk: 0, severity: "moderate", duration: "1 day",
    evidence: ["Young stock in a confirmed shed", "Fever and drooling"],
    case: { id: "c-moti", code: "CASE-2026-00429", status: "triaged", opened: 1, summary: "Heifer in the confirmed shed. Triaged high. Awaiting examination." },
  },
  {
    id: "MH-SAT-00610", name: "Savitri", species: "cattle", breed: "Deoni", sex: "female", age: 47, weight: 390, farm: "f-jadhav",
    status: "suspected", risk: "high", suspected: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["mouth", "hooves"], symptoms: ["mouth_lesions", "salivation", "hoof_lesions", "lameness", "fever"], milk: 6.8,
    severity: "severe", duration: "2 days",
    evidence: ["Lesions in mouth and hoof", "2.1 km from Patil Dairy", "Sample in transit"],
    case: { id: "c-sav", code: "CASE-2026-00420", status: "sampled", opened: 3, summary: "Malwadi in-contact farm. Lesions consistent with the Kalevadi pattern. Sample in transit." },
    sample: { id: "s-sav", code: "SMP-2026-1188", type: "Foot epithelium", test: "FMD antigen ELISA", status: "in_transit", collected: 2 },
    vet: { findings: "Dental-pad lesions and one ruptured coronary vesicle. Farm shares a bullock cart track with Kalevadi.", dx: "Foot-and-mouth disease", rec: "Hold all movement. Sample dispatched. Check the two other Deoni cows this evening.", days: 2 },
  },
  {
    id: "MH-SAT-00611", name: "Parvati", species: "cattle", breed: "Deoni", sex: "female", age: 33, weight: 348, farm: "f-jadhav",
    status: "suspected", risk: "high", suspected: "Foot-and-mouth disease", diseaseId: "fmd",
    regions: ["hooves", "mouth"], symptoms: ["lameness", "salivation", "anorexia"], milk: 7.1, severity: "moderate", duration: "1 day",
    evidence: ["Lameness plus early salivation", "Same farm as Savitri"],
    case: { id: "c-par", code: "CASE-2026-00423", status: "examined", opened: 2, summary: "Second animal on Jadhav Farm. Pattern matches the cluster." },
    vet: { findings: "Short stride, sensitive on both forefeet. Thin strand of saliva. Oral mucosa reddened, vesicles not yet ruptured.", dx: "Foot-and-mouth disease", rec: "Isolate beside Savitri. Re-check tomorrow for sampleable epithelium.", days: 1 },
  },
  {
    id: "MH-SAT-00501", name: "Yamuna", species: "buffalo", breed: "Pandharpuri", sex: "female", age: 50, weight: 470, farm: "f-more",
    status: "healthy", risk: "low", milk: 8.8, regions: [],
  },
  {
    id: "MH-SAT-00502", name: "Krishna", species: "buffalo", breed: "Murrah", sex: "female", age: 44, weight: 510, farm: "f-more",
    status: "observation", risk: "low", suspected: "Non-specific illness", diseaseId: "nonspecific",
    regions: [], symptoms: ["milk_drop"], milk: 6.2, severity: "mild", duration: "3 days",
    evidence: ["Milk drop without fever or lesions"],
    case: { id: "c-kri", code: "CASE-2026-00402", status: "examined", opened: 3, summary: "Milk drop. No FMD lesions. Observation only." },
    vet: { findings: "Afebrile. Mouth and feet clear. Milk drop likely feed-related. Not included in the FMD cluster.", dx: "Non-specific illness", rec: "Recheck yield in 48 hours.", days: 3 },
  },
  {
    id: "MH-SAT-00510", name: "Bhairav", species: "buffalo", breed: "Murrah", sex: "male", age: 38, weight: 560, farm: "f-more",
    status: "healthy", risk: "low", regions: [],
  },
  {
    id: "MH-SAT-00620", name: "Tulsi", species: "cattle", breed: "HF cross", sex: "female", age: 55, weight: 476, farm: "f-umbraj",
    status: "observation", risk: "moderate", suspected: "Lumpy skin disease", diseaseId: "lsd",
    regions: ["skin", "neck"], symptoms: ["skin_nodules", "fever", "milk_drop"], milk: 12.4, severity: "moderate", duration: "5 days",
    evidence: ["Firm skin nodules", "No oral vesicles", "Geographically outside the FMD ring"],
    case: { id: "c-tulsi", code: "CASE-2026-00396", status: "examined", opened: 5, summary: "Possible LSD. Separate syndrome from the Karad FMD cluster." },
    vet: { findings: "Multiple 1–3 cm cutaneous nodules over neck and flank. Mouth and feet clear. Differential kept open.", dx: "Lumpy skin disease", rec: "Insect control. Do not move. Consider PCR if nodules enlarge.", days: 4 },
  },
  {
    id: "MH-SAT-00621", name: "Rani", species: "cattle", breed: "Jersey cross", sex: "female", age: 29, weight: 340, farm: "f-umbraj",
    status: "deceased", risk: "critical", suspected: "Haemorrhagic septicaemia", confirmed: "Haemorrhagic septicaemia", diseaseId: "hs",
    regions: ["neck", "respiratory"], symptoms: ["fever", "respiratory", "throat_swelling", "depression"],
    mortality: { cause: "Haemorrhagic septicaemia", notes: "Died overnight before the second visit. Acute throat swelling reported by the co-op attendant.", days: 18 },
    case: { id: "c-rani", code: "CASE-2026-00312", status: "closed", opened: 19, closed: 18, summary: "Acute HS-pattern death at Umbraj. Closed after post-event investigation." },
  },
  {
    id: "MH-SAT-00622", name: "Sita", species: "cattle", breed: "HF cross", sex: "female", age: 24, weight: 322, farm: "f-umbraj",
    status: "healthy", risk: "low", milk: 10.1, regions: [],
  },
  {
    id: "MH-SAT-00701", name: "Himani", species: "cattle", breed: "Khillar", sex: "female", age: 46, weight: 360, farm: "f-kale",
    status: "recovering", risk: "moderate", suspected: "Theileriosis", confirmed: "Theileriosis", diseaseId: "theileriosis",
    regions: ["skin", "neck"], symptoms: ["fever", "ticks", "lymph_nodes", "weight_loss"], milk: 5.8,
    evidence: ["Blood smear positive", "Heavy ticks", "Now eating"],
    case: { id: "c-him", code: "CASE-2026-00310", status: "closed", opened: 24, closed: 6, summary: "Theileriosis confirmed on smear. Treatment completed. Case closed, recovery monitoring continues." },
    sample: { id: "s-him", code: "SMP-2026-1044", type: "Whole blood / smear", test: "Giemsa smear", status: "result_available", result: "positive", note: "Theileria piroplasms seen.", collected: 22, resultDays: 20 },
    treatment: { medicine: "Buparvaquone", dosage: "2.5 mg/kg IM", frequency: "Single dose, repeated once", start: 20, days: 7, response: "Temperature settled. Appetite returning.", status: "completed", follow: 4 },
    vet: { findings: "High fever, prescapular lymph nodes enlarged, ticks in the ear and tail switch.", dx: "Theileriosis", rec: "Buparvaquone and tick control for the herd.", days: 21 },
  },
  {
    id: "MH-SAT-00702", name: "Phulwa", species: "cattle", breed: "Khillar", sex: "female", age: 38, weight: 342, farm: "f-kale",
    status: "healthy", risk: "low", milk: 6.4, regions: [],
  },
  {
    id: "MH-SAT-00710", name: "Bhola", species: "cattle", breed: "Khillar", sex: "male", age: 72, weight: 498, farm: "f-kale",
    status: "healthy", risk: "low", regions: [],
  },
  {
    id: "MH-SAT-00801", name: "Chameli", species: "cattle", breed: "Gir", sex: "female", age: 31, weight: 336, farm: "f-pawar",
    status: "observation", risk: "moderate", suspected: "Lumpy skin disease", diseaseId: "lsd",
    regions: ["skin"], symptoms: ["skin_nodules", "fever"], milk: 7.8, severity: "mild", duration: "4 days",
    evidence: ["Few skin nodules", "PCR pending"],
    case: { id: "c-cham", code: "CASE-2026-00405", status: "sampled", opened: 4, summary: "Mild nodular skin disease. Sample received at the district lab." },
    sample: { id: "s-cham", code: "SMP-2026-1180", type: "Skin nodule biopsy", test: "LSD PCR", status: "received", collected: 3 },
    vet: { findings: "Six cutaneous nodules. No FMD lesions. Insect bites also present.", dx: "Lumpy skin disease", rec: "Sample sent. Isolate from the milking line until PCR returns.", days: 3 },
  },
  {
    id: "MH-SAT-00802", name: "Gulab", species: "cattle", breed: "Gir", sex: "female", age: 44, weight: 372, farm: "f-pawar",
    status: "healthy", risk: "low", milk: 8.2, regions: [],
  },
  {
    id: "MH-SAT-00810", name: "Malhar", species: "buffalo", breed: "Pandharpuri", sex: "male", age: 36, weight: 540, farm: "f-pawar",
    status: "healthy", risk: "low", regions: [],
  },
  {
    id: "MH-SAT-00901", name: "Jui", species: "cattle", breed: "Khillar", sex: "female", age: 41, weight: 350, farm: "f-deshmukh",
    status: "healthy", risk: "low", milk: 5.9, regions: [],
  },
  {
    id: "MH-SAT-00902", name: "Bakul", species: "buffalo", breed: "Murrah", sex: "female", age: 58, weight: 524, farm: "f-deshmukh",
    status: "recovering", risk: "moderate", suspected: "Haemorrhagic septicaemia", confirmed: "Haemorrhagic septicaemia", diseaseId: "hs",
    regions: ["neck", "respiratory"], symptoms: ["fever", "respiratory", "throat_swelling"], milk: 4.4,
    evidence: ["Throat swelling resolved", "Culture supported HS", "Now standing and eating"],
    case: { id: "c-bakul", code: "CASE-2026-00355", status: "closed", opened: 28, closed: 9, summary: "HS confirmed and treated. Case closed. Recovery monitoring for 14 days." },
    sample: { id: "s-bakul", code: "SMP-2026-1019", type: "Blood culture", test: "Pasteurella culture", status: "result_available", result: "positive", note: "Consistent with Pasteurella multocida.", collected: 27, resultDays: 24 },
    treatment: { medicine: "Oxytetracycline + meloxicam", dosage: "10 mg/kg IM", frequency: "Once daily for 5 days", start: 26, days: 5, response: "Breathing easier. Oedema resolved.", status: "completed", follow: 6 },
    vet: { findings: "High fever, submandibular oedema, respiratory noise. Emergency treatment started on farm.", dx: "Haemorrhagic septicaemia", rec: "Complete antibiotics. HS ring vaccination for the village before next monsoon.", days: 26 },
  },
  {
    id: "MH-SAT-00903", name: "Arjun", species: "cattle", breed: "Khillar", sex: "male", age: 80, weight: 470, farm: "f-deshmukh",
    status: "deceased", risk: "critical", suspected: "Black quarter", confirmed: "Black quarter", diseaseId: "bq",
    regions: ["legs"], symptoms: ["muscle_swelling", "lameness", "fever", "recumbency"],
    mortality: { cause: "Black quarter", notes: "Acute death with emphysematous swelling of the left hindquarter. Carcass handled under veterinary advice.", days: 40 },
    case: { id: "c-arjun", code: "CASE-2026-00288", status: "closed", opened: 41, closed: 39, summary: "Black quarter death. Village reminded on BQ vaccination of young stock." },
  },
  {
    id: "MH-SAN-01001", name: "Mangal", species: "buffalo", breed: "Pandharpuri", sex: "female", age: 49, weight: 488, farm: "f-tasgaon",
    status: "healthy", risk: "low", milk: 7.6, regions: [],
  },
  {
    id: "MH-SAN-01002", name: "Shyama", species: "buffalo", breed: "Murrah", sex: "female", age: 37, weight: 502, farm: "f-tasgaon",
    status: "healthy", risk: "moderate", milk: 8.1, regions: [],
  },
  {
    id: "MH-SAN-01003", name: "Holi", species: "cattle", breed: "Khillar", sex: "female", age: 33, weight: 328, farm: "f-tasgaon",
    status: "healthy", risk: "low", milk: 5.4, regions: [],
  },
  {
    id: "MH-SAN-01101", name: "Komal", species: "cattle", breed: "HF cross", sex: "female", age: 45, weight: 454, farm: "f-joshi",
    status: "healthy", risk: "low", milk: 13.6, regions: [],
  },
  {
    id: "MH-SAN-01102", name: "Narmada", species: "cattle", breed: "HF cross", sex: "female", age: 30, weight: 390, farm: "f-joshi",
    status: "observation", risk: "moderate", suspected: "Mastitis", diseaseId: "mastitis",
    regions: ["udder"], symptoms: ["udder_swelling", "abnormal_milk"], milk: 9.2, severity: "mild", duration: "1 day",
    evidence: ["Left fore quarter swollen", "No systemic dullness yet"],
    case: { id: "c-nar", code: "CASE-2026-00433", status: "examined", opened: 1, summary: "Early mastitis. Milk sample in testing." },
    sample: { id: "s-nar", code: "SMP-2026-1190", type: "Milk", test: "Culture and sensitivity", status: "testing", collected: 1 },
    vet: { findings: "Left fore quarter warm. Clots in foremilk. Cow still eating.", dx: "Mastitis", rec: "Milk last. Culture before changing drug. Anti-inflammatory tonight.", days: 1 },
  },
  {
    id: "MH-SAN-01110", name: "Raja", species: "cattle", breed: "HF cross", sex: "male", age: 8, weight: 142, farm: "f-joshi",
    status: "healthy", risk: "low", regions: [],
  },
];

animalSeeds.push(
  {
    id: "MH-SAT-01201", name: "Chandni", species: "goat", breed: "Osmanabadi", sex: "female", age: 30, weight: 38, farm: "f-kamble",
    status: "suspected", risk: "high", suspected: "Peste des petits ruminants", diseaseId: "ppr",
    regions: ["mouth", "respiratory", "eyes"], symptoms: ["fever", "nasal_discharge", "mouth_lesions", "diarrhea", "anorexia"], milk: 0.9,
    severity: "severe", duration: "3 days",
    voice: "Bakri ko bukhar hai, naak se paani aa raha hai aur dast ho rahe hain.",
    evidence: ["Fever with nasal discharge", "Erosive mouth lesions", "Diarrhoea", "PPR booster not on record"],
    case: { id: "c-chandni", code: "CASE-2026-00436", status: "sampled", opened: 3, summary: "Osmanabadi doe with PPR-like signs. Nasal and ocular swabs sent to the district lab." },
    sample: { id: "s-chandni", code: "SMP-2026-1191", type: "Nasal + ocular swabs", test: "PPR antigen ELISA / RT-PCR", status: "received", collected: 2 },
    vet: { findings: "40.6°C. Mucopurulent nasal discharge, erosions on gums and dental pad, soiled hindquarters. Two pen-mates coughing.", dx: "Peste des petits ruminants", rec: "Isolate the doe. Stop flock grazing on common land. Ring PPR vaccination to be planned after confirmation.", days: 2 },
  },
  {
    id: "MH-SAT-01202", name: "Bijli", species: "goat", breed: "Osmanabadi", sex: "female", age: 22, weight: 32, farm: "f-kamble",
    status: "observation", risk: "moderate", suspected: "Peste des petits ruminants", diseaseId: "ppr",
    regions: ["respiratory"], symptoms: ["nasal_discharge", "anorexia"], milk: 0.7, severity: "mild", duration: "1 day",
    evidence: ["Pen-mate of Chandni", "Early nasal discharge"],
    case: { id: "c-bijli", code: "CASE-2026-00439", status: "triaged", opened: 1, summary: "In-contact doe with watery nasal discharge. Under observation." },
  },
  { id: "MH-SAT-01203", name: "Sultan", species: "goat", breed: "Sangamneri", sex: "male", age: 26, weight: 45, farm: "f-kamble", status: "healthy", risk: "low", regions: [] },
  { id: "MH-SAT-01301", name: "Kaali", species: "sheep", breed: "Deccani", sex: "female", age: 34, weight: 36, farm: "f-dhangar", status: "healthy", risk: "low", regions: [] },
  {
    id: "MH-SAT-01302", name: "Dhavli", species: "sheep", breed: "Madgyal", sex: "female", age: 28, weight: 40, farm: "f-dhangar",
    status: "recovering", risk: "moderate", suspected: "Foot rot", confirmed: "Foot rot", diseaseId: "nonspecific",
    regions: ["hooves"], symptoms: ["lameness"], severity: "moderate", duration: "6 days",
    evidence: ["Interdigital lesion with foul smell", "Responding to foot bath"],
    case: { id: "c-dhavli", code: "CASE-2026-00404", status: "treated", opened: 8, summary: "Foot rot on the left fore. Zinc sulphate foot bath for the camp." },
    treatment: { medicine: "Oxytetracycline LA + zinc sulphate foot bath", dosage: "20 mg/kg IM", frequency: "Single dose; foot bath daily", start: 7, days: 5, response: "Bearing weight again", status: "active", follow: -1 },
    vet: { findings: "Moist interdigital dermatitis with under-running of horn, left fore. No mouth lesions — not an FMD pattern.", dx: "Foot rot", rec: "Trim, long-acting antibiotic, and daily foot bath at the camp.", days: 7 },
  },
  { id: "MH-SAT-01303", name: "Raja", species: "sheep", breed: "Deccani", sex: "male", age: 40, weight: 52, farm: "f-dhangar", status: "healthy", risk: "low", regions: [] },
  { id: "MH-SAT-01401", name: "Heera", species: "camel", breed: "Marwari", sex: "female", age: 96, weight: 520, farm: "f-dhangar", status: "healthy", risk: "low", regions: [] },
  {
    id: "MH-SAN-01501", name: "Gulabi", species: "pig", breed: "Large White Yorkshire", sex: "female", age: 20, weight: 160, farm: "f-gaikwad",
    status: "suspected", risk: "critical", suspected: "African swine fever", diseaseId: "asf",
    regions: ["skin", "abdomen", "legs"], symptoms: ["fever", "skin_redness", "anorexia", "recumbency"], severity: "severe", duration: "2 days",
    evidence: ["High fever", "Red-purple blotches on ears, belly and legs", "Recumbent, off feed", "Notifiable — movement must stop"],
    case: { id: "c-gulabi", code: "CASE-2026-00437", status: "sampled", opened: 2, summary: "Sow with fever and cyanotic skin. EDTA blood referred for ASF PCR. Sty under movement hold." },
    sample: { id: "s-gulabi", code: "SMP-2026-1192", type: "EDTA blood + spleen swab", test: "ASF real-time PCR", status: "in_transit", collected: 1, lab: "ICAR-NIHSAD Bhopal (via RDDL Pune)" },
    vet: { findings: "41.2°C. Erythema and cyanosis on ears, ventral abdomen and hocks. Recumbent, reluctant to rise. One weaner died last week, not sampled.", dx: "African swine fever", rec: "Complete movement hold. No slaughter or sale. Biosecurity at the gate. Await PCR.", days: 1 },
  },
  {
    id: "MH-SAN-01502", name: "Bablu", species: "pig", breed: "LWY cross", sex: "male", age: 14, weight: 110, farm: "f-gaikwad",
    status: "observation", risk: "high", suspected: "African swine fever", diseaseId: "asf",
    regions: ["skin"], symptoms: ["fever", "anorexia"], severity: "mild", duration: "1 day",
    evidence: ["Same sty as Gulabi", "Mild fever"],
    case: { id: "c-bablu", code: "CASE-2026-00440", status: "assigned", opened: 1, summary: "In-contact boar with mild fever. Daily temperature checks." },
  },
  { id: "MH-SAN-01503", name: "Chiku", species: "pig", breed: "Ghungroo", sex: "female", age: 10, weight: 70, farm: "f-gaikwad", status: "healthy", risk: "moderate", regions: [] },
  {
    id: "MH-SAT-01601", name: "Kadak-17", species: "poultry", breed: "Kadaknath", sex: "female", age: 9, weight: 1.6, farm: "f-sawant",
    status: "suspected", risk: "high", suspected: "Newcastle disease", diseaseId: "newcastle",
    regions: ["respiratory", "neck", "head"], symptoms: ["respiratory", "neuro_signs", "diarrhea", "egg_drop"], severity: "severe", duration: "2 days",
    voice: "Murgi ki gardan mud rahi hai, saans le rahi hai muh khol ke, aur ande kam ho gaye.",
    evidence: ["Gasping and rales", "Torticollis", "Green diarrhoea", "Egg drop in the flock"],
    case: { id: "c-kadak", code: "CASE-2026-00438", status: "triaged", opened: 1, summary: "Backyard Kadaknath hen with respiratory and nervous signs. Four birds died in the flock this week." },
  },
  { id: "MH-SAT-01602", name: "Giri-04", species: "poultry", breed: "Giriraja", sex: "male", age: 12, weight: 3.2, farm: "f-sawant", status: "healthy", risk: "moderate", regions: [] },
  { id: "MH-SAT-01603", name: "Kadak-21", species: "poultry", breed: "Kadaknath", sex: "male", age: 10, weight: 1.9, farm: "f-sawant", status: "healthy", risk: "moderate", regions: [] },
);

const overdueFmd = new Set(["MH-SAN-01002", "MH-SAT-00428", "MH-SAT-00710", "MH-SAT-00903", "MH-SAT-01201", "MH-SAT-01601"]);
const dueSoon = new Set(["MH-SAT-00422", "MH-SAN-01101"]);

export async function seedDatabase(force = false) {
  await ensureMigrated();
  if (force) {
    await db.execute(sql`truncate table mortality_events, disease_trends, weather_readings, clusters, alerts, cases, lab_samples, vet_reports, treatments, vaccinations, media_assets, reports, timeline_events, animals, facilities, users, farms, villages, blocks, districts`);
  } else {
    const existing = await db.select({ id: animals.id }).from(animals).limit(1);
    if (existing.length) return { seeded: false };
  }

  const herdCount = Object.fromEntries(farmRows.map((f) => [f.id, animalSeeds.filter((a) => a.farm === f.id).length]));

  await db.insert(districts).values(districtRows);
  await db.insert(blocks).values(blockRows);
  await db.insert(villages).values(villageRows);
  await db.insert(farms).values(farmRows.map((f) => ({ ...f, herdSize: herdCount[f.id] || 0 })));
  await db.insert(users).values([
    { id: "u-meera", name: "Meera Patil", role: "farmer", phone: "+91 98220 11421", email: "meera.patil@praana.local", title: "Owner, Patil Dairy", language: "mr", farmId: "f-patil", villageId: "v-kalevadi", blockId: "b-karad", districtId: "d-satara", passwordHash: hashPassword(DEMO_PASSWORD) },
    { id: "u-raju", name: "Raju Shinde", role: "field", phone: "+91 97670 22881", email: "raju.shinde@praana.local", title: "Livestock supervisor, Karad", language: "mr", farmId: null, villageId: "v-kalevadi", blockId: "b-karad", districtId: "d-satara", passwordHash: hashPassword(DEMO_PASSWORD) },
    { id: "u-ananya", name: "Dr. Ananya Kulkarni", role: "vet", phone: "+91 98230 44510", email: "ananya.kulkarni@praana.local", title: "Veterinary Officer, Karad", language: "en", farmId: null, villageId: null, blockId: "b-karad", districtId: "d-satara", passwordHash: hashPassword(DEMO_PASSWORD) },
    { id: "u-sameer", name: "Dr. Sameer Joshi", role: "lab", phone: "+91 98811 90332", email: "sameer.joshi@praana.local", title: "Disease Investigation Officer", language: "en", farmId: null, villageId: null, blockId: null, districtId: "d-satara", passwordHash: hashPassword(DEMO_PASSWORD) },
    { id: "u-kavita", name: "Kavita Deshmukh", role: "government", phone: "+91 94220 10018", email: "kavita.deshmukh@praana.local", title: "District Animal Husbandry Officer", language: "en", farmId: null, villageId: null, blockId: null, districtId: null, passwordHash: hashPassword(DEMO_PASSWORD) },
  ]);
  await db.insert(facilities).values([
    { id: "fac-karad", name: "Taluka Veterinary Dispensary, Karad", kind: "vet_center", districtId: "d-satara", lat: 17.277, lng: 74.184, phone: "+91 2164 222019" },
    { id: "fac-satara", name: "District Veterinary Hospital, Satara", kind: "vet_center", districtId: "d-satara", lat: 17.692, lng: 74.006, phone: "+91 2162 234110" },
    { id: "fac-lab", name: "District Disease Investigation Lab, Satara", kind: "lab", districtId: "d-satara", lat: 17.688, lng: 74.018, phone: "+91 2162 234455" },
    { id: "fac-pune", name: "RDDL Pune — referral", kind: "lab", districtId: "d-satara", lat: 18.52, lng: 73.856, phone: "+91 20 2569 2210" },
    { id: "fac-sangli", name: "Taluka Veterinary Dispensary, Tasgaon", kind: "vet_center", districtId: "d-sangli", lat: 17.03, lng: 74.61, phone: "+91 2346 222018" },
  ]);

  for (const a of animalSeeds) {
    const vaxDate = overdueFmd.has(a.id) ? daysAgo(210) : dueSoon.has(a.id) ? daysAgo(165) : daysAgo(38);
    await db.insert(animals).values({
      id: a.id,
      name: a.name,
      species: a.species,
      breed: a.breed,
      sex: a.sex,
      ageMonths: a.age,
      weightKg: a.weight,
      farmId: a.farm,
      status: a.status,
      riskLevel: a.risk,
      suspectedCondition: a.suspected ?? null,
      confirmedCondition: a.confirmed ?? null,
      affectedRegions: a.regions ?? [],
      lastExamAt: a.vet ? daysAgo(a.vet.days) : null,
      lastVaccinationAt: vaxDate,
      milkYieldL: a.milk ?? null,
      pregnant: Boolean(a.pregnant),
      updatedAt: a.case ? daysAgo(Math.min(a.case.opened, 1), 7) : daysAgo(2),
    });

    await db.insert(timelineEvents).values({
      id: nid("evt"),
      animalId: a.id,
      caseId: null,
      type: "registration",
      title: "Animal registered",
      detail: `Ear tag ${a.id} added to the ${farmRows.find((f) => f.id === a.farm)?.name} herd.`,
      actor: "Raju Shinde",
      occurredAt: daysAgo(26),
    });
    await db.insert(timelineEvents).values({
      id: nid("evt"),
      animalId: a.id,
      caseId: null,
      type: "vaccination",
      title: "Vaccination administered",
      detail: overdueFmd.has(a.id) ? "FMD dose is now overdue." : "FMD, HS and BQ recorded.",
      actor: "Dr. Ananya Kulkarni",
      occurredAt: vaxDate,
    });

    const speciesVax = SPECIES_META[a.species].vaccines;
    const vaccines = a.species === "cattle" && a.age < 12 ? ["FMD", "HS"] : speciesVax;
    for (const vaccine of vaccines) {
      const primary = vaccine === speciesVax[0];
      const given = primary ? vaxDate : daysAgo(vaccine === "HS" ? 80 : vaccine === "BQ" ? 120 : 50);
      const next = new Date(given);
      next.setDate(next.getDate() + (primary ? 180 : 365));
      const status = next.getTime() < Date.now() ? "overdue" : next.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 21 ? "due" : "completed";
      await db.insert(vaccinations).values({
        id: nid("vax"),
        animalId: a.id,
        vaccine,
        dose: vaccine === "FMD" ? "2 ml IM" : vaccine === "LSD" ? "1 ml SC" : "2 ml SC",
        batch: `${vaccine}-MH-26-${(a.id.charCodeAt(a.id.length - 1) + vaccine.length) % 90}`,
        givenAt: given,
        nextDue: next,
        vetName: "Dr. Ananya Kulkarni",
        status,
      });
    }

    if (a.symptoms && a.diseaseId && a.case) {
      await db.insert(reports).values({
        id: nid("rpt"),
        animalId: a.id,
        caseId: a.case.id,
        reporterId: a.farm === "f-patil" ? "u-meera" : "u-raju",
        reporterName: a.farm === "f-patil" ? "Meera Patil" : "Raju Shinde",
        symptoms: a.symptoms,
        regions: a.regions ?? [],
        severity: a.severity || "moderate",
        duration: a.duration || "2 days",
        notes: a.case.summary,
        voiceTranscript: a.voice ?? null,
        language: a.voice ? "hi" : "en",
        triage: triage(a.diseaseId, a.risk, a.evidence || a.symptoms) as unknown as Record<string, unknown>,
        lat: farmRows.find((f) => f.id === a.farm)?.lat ?? null,
        lng: farmRows.find((f) => f.id === a.farm)?.lng ?? null,
        createdAt: daysAgo(a.case.opened, 9),
        syncStatus: "synced",
      });
      await db.insert(timelineEvents).values({
        id: nid("evt"),
        animalId: a.id,
        caseId: a.case.id,
        type: "report",
        title: "Owner / field report",
        detail: a.voice || a.symptoms.join(", "),
        actor: a.farm === "f-patil" ? "Meera Patil" : "Raju Shinde",
        occurredAt: daysAgo(a.case.opened, 9),
      });
      await db.insert(timelineEvents).values({
        id: nid("evt"),
        animalId: a.id,
        caseId: a.case.id,
        type: "triage",
        title: `Triage · possible ${a.suspected || "illness"}`,
        detail: `Risk ${a.risk}. Decision support only — not a diagnosis.`,
        actor: "Praana rule engine",
        occurredAt: daysAgo(a.case.opened, 9),
      });
    }

    if (a.case) {
      await db.insert(cases).values({
        id: a.case.id,
        caseCode: a.case.code,
        animalId: a.id,
        status: a.case.status,
        riskLevel: a.risk,
        suspected: a.confirmed || a.suspected || null,
        assignedVetId: "u-ananya",
        assignedVetName: "Dr. Ananya Kulkarni",
        summary: a.case.summary,
        openedAt: daysAgo(a.case.opened, 9),
        closedAt: a.case.closed != null ? daysAgo(a.case.closed, 16) : null,
      });
    }
    if (a.vet && a.case) {
      await db.insert(vetReports).values({
        id: nid("vet"),
        animalId: a.id,
        caseId: a.case.id,
        vetId: "u-ananya",
        vetName: "Dr. Ananya Kulkarni",
        findings: a.vet.findings,
        suspectedDx: a.vet.dx,
        recommendations: a.vet.rec,
        examinedAt: daysAgo(a.vet.days, 11),
      });
      await db.insert(timelineEvents).values({
        id: nid("evt"),
        animalId: a.id,
        caseId: a.case.id,
        type: "exam",
        title: "Veterinary examination",
        detail: a.vet.findings,
        actor: "Dr. Ananya Kulkarni",
        occurredAt: daysAgo(a.vet.days, 11),
      });
    }
    if (a.sample && a.case) {
      await db.insert(labSamples).values({
        id: a.sample.id,
        sampleCode: a.sample.code,
        animalId: a.id,
        caseId: a.case.id,
        sampleType: a.sample.type,
        collectedAt: daysAgo(a.sample.collected, 15),
        collector: "Dr. Ananya Kulkarni",
        labName: a.sample.lab || "District Disease Investigation Lab, Satara",
        testName: a.sample.test,
        status: a.sample.status,
        result: a.sample.result ?? null,
        resultNote: a.sample.note ?? null,
        resultAt: a.sample.resultDays != null ? daysAgo(a.sample.resultDays, 13) : null,
      });
      await db.insert(timelineEvents).values({
        id: nid("evt"),
        animalId: a.id,
        caseId: a.case.id,
        type: "sample",
        title: "Sample collected",
        detail: `${a.sample.code} · ${a.sample.type}`,
        actor: "Dr. Ananya Kulkarni",
        occurredAt: daysAgo(a.sample.collected, 15),
      });
      if (a.sample.result && a.sample.resultDays != null) {
        await db.insert(timelineEvents).values({
          id: nid("evt"),
          animalId: a.id,
          caseId: a.case.id,
          type: "lab",
          title: a.sample.result === "positive" ? "Laboratory result · positive" : "Laboratory result",
          detail: `${a.sample.code}: ${a.sample.result}. ${a.sample.note || ""}`,
          actor: "Dr. Sameer Joshi",
          occurredAt: daysAgo(a.sample.resultDays, 13),
        });
      }
    }
    if (a.treatment && a.case) {
      const start = daysAgo(a.treatment.start, 10);
      const end = new Date(start);
      end.setDate(end.getDate() + a.treatment.days);
      await db.insert(treatments).values({
        id: nid("tx"),
        animalId: a.id,
        caseId: a.case.id,
        condition: a.confirmed || a.suspected || "Clinical syndrome",
        medicine: a.treatment.medicine,
        dosage: a.treatment.dosage,
        frequency: a.treatment.frequency,
        startDate: start,
        endDate: end,
        vetName: "Dr. Ananya Kulkarni",
        response: a.treatment.response,
        followUp: a.treatment.follow != null ? daysAgo(a.treatment.follow, 9) : null,
        status: a.treatment.status,
      });
      await db.insert(timelineEvents).values({
        id: nid("evt"),
        animalId: a.id,
        caseId: a.case.id,
        type: "treatment",
        title: "Treatment started",
        detail: a.treatment.medicine,
        actor: "Dr. Ananya Kulkarni",
        occurredAt: start,
      });
    }
    if (a.status === "recovering" && a.case) {
      await db.insert(timelineEvents).values({
        id: nid("evt"),
        animalId: a.id,
        caseId: a.case.id,
        type: "recovery",
        title: "Recovery monitoring",
        detail: "Appetite and posture being watched at the shed.",
        actor: "Field team",
        occurredAt: daysAgo(1, 8),
      });
    }
    if (a.mortality) {
      const farm = farmRows.find((f) => f.id === a.farm);
      await db.insert(mortalityEvents).values({
        id: nid("mort"),
        animalId: a.id,
        cause: a.mortality.cause,
        notes: a.mortality.notes,
        occurredAt: daysAgo(a.mortality.days, 5),
        reportedBy: "Dr. Ananya Kulkarni",
        villageId: farm?.villageId ?? null,
      });
      await db.insert(timelineEvents).values({
        id: nid("evt"),
        animalId: a.id,
        caseId: a.case?.id ?? null,
        type: "mortality",
        title: "Mortality recorded",
        detail: a.mortality.cause,
        actor: "Dr. Ananya Kulkarni",
        occurredAt: daysAgo(a.mortality.days, 5),
      });
    }
  }

  const gauriMouth = plate("Gauri · oral mucosa", "DAY 0 · MOUTH", "#b42318", 7);
  const gauriMouth2 = plate("Gauri · oral mucosa", "DAY 2 · PROGRESSION", "#8d3f16", 11);
  const gauriHoof = plate("Gauri · coronary band", "DAY 0 · HOOF", "#c4622d", 4);
  const radhaMouth = plate("Radha · dental pad", "CONFIRMED SHED · MOUTH", "#b42318", 9);
  await db.insert(mediaAssets).values([
    { id: "med-g1", animalId: "MH-SAT-00421", reportId: null, kind: "photo", region: "mouth", caption: "Dental pad and tongue — day of report", url: gauriMouth, capturedAt: daysAgo(5, 9), lat: 17.2915, lng: 74.1865, reporterName: "Meera Patil" },
    { id: "med-g2", animalId: "MH-SAT-00421", reportId: null, kind: "photo", region: "mouth", caption: "Same view, two days later", url: gauriMouth2, capturedAt: daysAgo(3, 9), lat: 17.2915, lng: 74.1865, reporterName: "Dr. Ananya Kulkarni" },
    { id: "med-g3", animalId: "MH-SAT-00421", reportId: null, kind: "photo", region: "hooves", caption: "Coronary band, both forefeet", url: gauriHoof, capturedAt: daysAgo(5, 10), lat: 17.2915, lng: 74.1865, reporterName: "Meera Patil" },
    { id: "med-r1", animalId: "MH-SAT-00430", reportId: null, kind: "photo", region: "mouth", caption: "Oral epithelium before sampling", url: radhaMouth, capturedAt: daysAgo(6, 12), lat: 17.2848, lng: 74.1912, reporterName: "Dr. Ananya Kulkarni" },
    { id: "med-r2", animalId: "MH-SAT-00430", reportId: null, kind: "prescription", region: null, caption: "Supportive-care prescription", url: plate("Prescription · Radha", "FLUNIXIN + ORAL CARE", "#1f6f5b", 2), capturedAt: daysAgo(2, 11), lat: 17.2848, lng: 74.1912, reporterName: "Dr. Ananya Kulkarni" },
  ]);

  await db.insert(alerts).values([
    { id: "alt-cluster", type: "cluster", title: "Potential disease cluster detected", body: "8 FMD-pattern cases across 3 farms within 5 km — Patil Dairy, Shinde Farm and Jadhav Farm.", location: "Kalevadi–Malwadi, Karad block, Satara", riskLevel: "critical", action: "Hold animal movement, finish clinical checks, and keep the district lab in the loop.", animalId: "MH-SAT-00421", caseId: "c-gauri", audience: "government", createdAt: daysAgo(1, 8), readBy: [] },
    { id: "alt-cluster-field", type: "cluster", title: "Three farms need a same-day sweep", body: "Kalevadi and Malwadi show the same mouth-and-hoof pattern. Do not wait for every laboratory slip.", location: "Karad block", riskLevel: "high", action: "Visit in-contact sheds and register any new drooling or lameness before evening.", animalId: null, caseId: null, audience: "field", createdAt: daysAgo(1, 8), readBy: [] },
    { id: "alt-gauri", type: "suspected", title: "Possible FMD — Gauri", body: "Mouth lesions, salivation and hoof pain. Sample SMP-2026-1184 is in testing.", location: "Patil Dairy, Kalevadi", riskLevel: "high", action: "Isolate → examine in-contacts → chase the laboratory result.", animalId: "MH-SAT-00421", caseId: "c-gauri", audience: "vet", createdAt: daysAgo(0, 6), readBy: [] },
    { id: "alt-radha", type: "lab_result", title: "Laboratory confirmation — Radha", body: "FMD antigen ELISA positive, serotype O. This is the anchor confirmation for the Kalevadi cluster.", location: "Shinde Farm, Kalevadi", riskLevel: "critical", action: "Keep isolation, start ring planning, and survey farms inside 5 km.", animalId: "MH-SAT-00430", caseId: "c-radha", audience: "all", createdAt: daysAgo(2, 13), readBy: [] },
    { id: "alt-vax", type: "vaccination", title: "FMD vaccination overdue — Shyama", body: "Murrah buffalo at Tasgaon has no FMD dose inside the 6-month window.", location: "Patil Buffalo Shed, Tasgaon", riskLevel: "moderate", action: "Schedule the booster this week, before any animal is moved toward Satara.", animalId: "MH-SAN-01002", caseId: null, audience: "field", createdAt: daysAgo(0, 5), readBy: [] },
    { id: "alt-mort", type: "mortality", title: "Mortality — Rani, Umbraj", body: "Acute haemorrhagic septicaemia pattern. Not part of the FMD cluster, but the co-op shed needs a fresh HS check.", location: "Umbraj Coop Shed", riskLevel: "high", action: "Review in-contacts and confirm HS cover before the next wet spell.", animalId: "MH-SAT-00621", caseId: "c-rani", audience: "government", createdAt: daysAgo(18, 6), readBy: [] },
    { id: "alt-follow", type: "followup", title: "Follow-up today — Kamdhenu", body: "Mastitis quarter is clearing. Confirm milk withholding before the evening pour.", location: "Patil Dairy, Kalevadi", riskLevel: "moderate", action: "Examine the quarter and record response on the twin.", animalId: "MH-SAT-00102", caseId: "c-kam", audience: "vet", createdAt: daysAgo(0, 4), readBy: [] },
    { id: "alt-farmer", type: "advisory", title: "गौरी: संभावित खुरपका-मुँहपका", body: "यह निदान नहीं है। गौरी को झुंड से अलग रखें, बाज़ार न ले जाएँ, और बाड़े के हर पशु के मुँह व खुर देखें।", location: "पाटिल डेयरी, कलेवाडी", riskLevel: "high", action: "पशु चिकित्सक की अगली विज़िट तक गौरी को अलग रखें।", animalId: "MH-SAT-00421", caseId: "c-gauri", audience: "farmer", createdAt: daysAgo(0, 6), readBy: [] },
    { id: "alt-asf", type: "suspected", title: "Possible African swine fever — Gulabi", body: "Sow with 41.2°C fever and cyanotic skin at Gaikwad Piggery. EDTA blood is in transit for ASF PCR. One unsampled weaner death last week.", location: "Gaikwad Piggery, Kavlapur, Miraj block", riskLevel: "critical", action: "Hold all pig movement within 1 km, stop slaughter and sale, and enforce gate biosecurity until PCR returns.", animalId: "MH-SAN-01501", caseId: "c-gulabi", audience: "government", createdAt: daysAgo(0, 7), readBy: [] },
    { id: "alt-ppr", type: "suspected", title: "Possible PPR — Kamble goat unit", body: "Chandni has fever, nasal discharge, mouth erosions and diarrhoea. Swabs have been received by the lab. A pen-mate is showing early signs.", location: "Kamble Goat Unit, Aundh", riskLevel: "high", action: "Stop grazing on common land and list every goat in the pen for a same-day check.", animalId: "MH-SAT-01201", caseId: "c-chandni", audience: "field", createdAt: daysAgo(1, 10), readBy: [] },
    { id: "alt-nd", type: "suspected", title: "Possible Newcastle disease — backyard flock", body: "A Kadaknath hen with twisted neck and gasping. Four flock deaths this week at Sawant Backyard Poultry.", location: "Rethare Bk., Karad block", riskLevel: "high", action: "Pen sick birds apart, stop bird and egg sales, and plan RD ring vaccination.", animalId: "MH-SAT-01601", caseId: "c-kadak", audience: "vet", createdAt: daysAgo(0, 9), readBy: [] },
    { id: "alt-lab", type: "lab", title: "Sample in transit — Savitri", body: "SMP-2026-1188 left Malwadi and has not been receipted.", location: "District Disease Investigation Lab, Satara", riskLevel: "high", action: "Receive and start FMD antigen ELISA today.", animalId: "MH-SAT-00610", caseId: "c-sav", audience: "lab", createdAt: daysAgo(1, 15), readBy: [] },
  ]);

  await db.insert(clusters).values({
    id: "CLU-HS-PHALTAN",
    title: "Contained HS signal — Pusesavali",
    disease: "Haemorrhagic septicaemia",
    diseaseId: "hs",
    riskLevel: "moderate",
    radiusKm: 3,
    centerLat: 17.919,
    centerLng: 74.402,
    animalIds: ["MH-SAT-00902"],
    farmIds: ["f-deshmukh"],
    summary: "One confirmed HS recovery and no new cases in 3 weeks. Kept on the map as contained.",
    detectedAt: daysAgo(28),
    status: "contained",
  });

  const bases: Record<string, { t: number; h: number; note: string }> = {
    "v-kalevadi": { t: 28.6, h: 79, note: "Post-monsoon humidity. Damp yards can help FMD virus persist outside the host." },
    "v-malwadi": { t: 28.4, h: 77, note: "Same weather cell as Kalevadi, inside the 5 km watch ring." },
    "v-rethare": { t: 28.8, h: 74, note: "Warm and humid. Buffalo shed still clear of the FMD pattern." },
    "v-umbraj": { t: 29.1, h: 76, note: "Humid river-edge village. HS risk rises if another wet pulse arrives." },
    "v-vaduj": { t: 30.2, h: 58, note: "Drier plateau air. Tick pressure still visible on Khillar cattle." },
    "v-aundh": { t: 27.4, h: 70, note: "Cooler hill-edge mornings. Biting flies active in the afternoon." },
    "v-pusesavali": { t: 29.8, h: 62, note: "Dry spell after the HS episode. Keep the vaccination ring closed." },
    "v-tasgaon": { t: 29.4, h: 66, note: "No active cluster. Overdue FMD cover is the local gap." },
    "v-kavlapur": { t: 28.9, h: 68, note: "Quiet shed. One early mastitis case only." },
  };
  const weather = [];
  for (const v of villageRows) {
    const base = bases[v.id];
    for (let d = 0; d < 10; d++) {
      weather.push({
        id: `wx-${v.id}-${d}`,
        villageId: v.id,
        date: daysAgo(d, 7),
        tempC: Math.round((base.t - d * 0.18 + (d % 3) * 0.2) * 10) / 10,
        humidity: Math.round(base.h - d * 0.8 + (d % 2) * 2),
        rainfallMm: d === 1 ? 14 : d === 4 ? 6 : d === 8 ? 2 : 0,
        note: d === 0 ? base.note : null,
      });
    }
  }
  await db.insert(weatherReadings).values(weather);

  const trendDiseases = ["Foot-and-mouth disease", "Haemorrhagic septicaemia", "Lumpy skin disease", "Mastitis", "Theileriosis"];
  const pattern: Record<string, number[]> = {
    "Foot-and-mouth disease": [2, 1, 1, 2, 3, 4, 5, 4, 3, 5, 8, 11],
    "Haemorrhagic septicaemia": [1, 1, 2, 4, 6, 5, 3, 2, 1, 1, 1, 1],
    "Lumpy skin disease": [3, 4, 4, 3, 2, 2, 3, 5, 4, 3, 2, 2],
    Mastitis: [6, 5, 6, 7, 6, 5, 6, 7, 8, 6, 7, 6],
    Theileriosis: [2, 2, 3, 2, 1, 1, 2, 3, 4, 3, 2, 2],
  };
  const trends = [];
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - offset);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = 11 - offset;
    for (const disease of trendDiseases) {
      const satara = pattern[disease][idx];
      trends.push({ id: `tr-sat-${month}-${disease.slice(0, 3)}`, month, districtId: "d-satara", disease, cases: satara, deaths: disease.includes("Haem") && satara > 4 ? 1 : disease.includes("Foot") && idx > 9 ? 1 : 0 });
      trends.push({ id: `tr-san-${month}-${disease.slice(0, 3)}`, month, districtId: "d-sangli", disease, cases: Math.max(0, Math.round(satara * 0.35)), deaths: 0 });
    }
  }
  await db.insert(diseaseTrends).values(trends);

  try {
    await refreshClusters();
  } catch (error) {
    console.error("Cluster refresh skipped", error);
  }
  const fmdClusters = await db.select().from(clusters).where(eq(clusters.diseaseId, "fmd"));
  if (!fmdClusters.length) {
    await db.insert(clusters).values({
      id: "CLU-FMD-KARAD",
      title: "Potential FMD cluster — Kalevadi belt",
      disease: "Foot-and-mouth disease",
      diseaseId: "fmd",
      riskLevel: "critical",
      radiusKm: 5,
      centerLat: 17.293,
      centerLng: 74.192,
      animalIds: ["MH-SAT-00421", "MH-SAT-00423", "MH-SAT-00424", "MH-SAT-00430", "MH-SAT-00431", "MH-SAT-00432", "MH-SAT-00610", "MH-SAT-00611"],
      farmIds: ["f-patil", "f-shinde", "f-jadhav"],
      summary: "8 FMD-pattern cases across 3 farms within 5 km.",
      detectedAt: daysAgo(2, 8),
      status: "active",
    });
  } else {
    await db
      .update(clusters)
      .set({
        title: "Potential FMD cluster — Kalevadi belt",
        summary: "8 FMD-pattern cases across 3 farms within 5 km.",
        detectedAt: daysAgo(2, 8),
        riskLevel: "critical",
      })
      .where(eq(clusters.diseaseId, "fmd"));
  }

  return { seeded: true, animals: animalSeeds.length };
}

let pending: Promise<unknown> | null = null;

export async function ensureSeeded() {
  await ensureMigrated();
  const existing = await db.select({ id: animals.id }).from(animals).limit(1);
  if (existing.length) return;
  if (!pending) {
    pending = seedDatabase(false).finally(() => {
      pending = null;
    });
  }
  await pending;
}
