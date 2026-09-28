export type Role = "farmer" | "field" | "vet" | "lab" | "government";
export type Species = "cattle" | "buffalo" | "goat" | "sheep" | "pig" | "camel" | "poultry";
export type Sex = "female" | "male";
export type HealthStatus =
  | "healthy"
  | "observation"
  | "suspected"
  | "confirmed"
  | "recovering"
  | "deceased";
export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type CaseStatus =
  | "reported"
  | "triaged"
  | "assigned"
  | "examined"
  | "sampled"
  | "tested"
  | "confirmed"
  | "rejected"
  | "treated"
  | "closed";
export type SampleStatus =
  | "collected"
  | "in_transit"
  | "received"
  | "testing"
  | "result_available";
export type Lang = "en" | "hi" | "mr";

export type TriageScore = { diseaseId: string; score: number };

export type TriageResult = {
  diseaseId: string;
  possibleCondition: string;
  localName: string;
  riskLevel: RiskLevel;
  confidence: "low" | "moderate" | "high";
  evidence: string[];
  evidenceCodes: string[];
  nextSteps: string[];
  nextStepIds: string[];
  disclaimer: string;
  scores: TriageScore[];
  weatherNote?: string;
};

export type TriageInput = {
  symptoms: string[];
  regions: string[];
  species: Species | string;
  ageMonths: number;
  vaccinatedAgainst: string[];
  history: string[];
  nearbySame: number;
  nearbyMortality: number;
  humidity: number;
  rainfallMm: number;
  photoRegions: string[];
  language?: Lang;
};

export type UserView = {
  id: string;
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  title: string | null;
  language: Lang;
  farmId: string | null;
  villageId: string | null;
  blockId: string | null;
  districtId: string | null;
};

export type AnimalView = {
  id: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  ageMonths: number;
  weightKg: number;
  status: HealthStatus;
  riskLevel: RiskLevel;
  suspectedCondition: string | null;
  confirmedCondition: string | null;
  affectedRegions: string[];
  lastExamAt: string | null;
  lastVaccinationAt: string | null;
  milkYieldL: number | null;
  pregnant: boolean;
  updatedAt: string;
  farmId: string;
  farmName: string;
  ownerName: string;
  ownerPhone: string | null;
  villageId: string;
  villageName: string;
  blockId: string;
  blockName: string;
  districtId: string;
  districtName: string;
  lat: number;
  lng: number;
  openCaseId: string | null;
  openCaseCode: string | null;
};

export type TimelineView = {
  id: string;
  animalId: string;
  caseId: string | null;
  type: string;
  title: string;
  detail: string | null;
  actor: string | null;
  occurredAt: string;
};

export type ReportView = {
  id: string;
  animalId: string;
  caseId: string | null;
  reporterName: string | null;
  symptoms: string[];
  regions: string[];
  severity: string;
  duration: string | null;
  notes: string | null;
  voiceTranscript: string | null;
  language: string | null;
  triage: TriageResult | null;
  createdAt: string;
  syncStatus: string;
};

export type MediaView = {
  id: string;
  animalId: string;
  reportId: string | null;
  kind: string;
  region: string | null;
  caption: string | null;
  url: string;
  capturedAt: string;
  reporterName: string | null;
};

export type VaccinationView = {
  id: string;
  animalId: string;
  vaccine: string;
  dose: string;
  batch: string;
  givenAt: string;
  nextDue: string | null;
  vetName: string;
  status: string;
};

export type TreatmentView = {
  id: string;
  animalId: string;
  caseId: string | null;
  condition: string;
  medicine: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  vetName: string;
  response: string | null;
  followUp: string | null;
  status: string;
};

export type VetReportView = {
  id: string;
  animalId: string;
  caseId: string | null;
  vetName: string;
  findings: string;
  suspectedDx: string | null;
  recommendations: string | null;
  examinedAt: string;
};

export type SampleView = {
  id: string;
  sampleCode: string;
  animalId: string;
  caseId: string | null;
  sampleType: string;
  collectedAt: string;
  collector: string;
  labName: string;
  testName: string;
  status: SampleStatus;
  result: string | null;
  resultNote: string | null;
  resultAt: string | null;
};

export type CaseView = {
  id: string;
  caseCode: string;
  animalId: string;
  status: CaseStatus;
  riskLevel: RiskLevel;
  suspected: string | null;
  assignedVetId: string | null;
  assignedVetName: string | null;
  summary: string | null;
  openedAt: string;
  closedAt: string | null;
};

export type AlertView = {
  id: string;
  type: string;
  title: string;
  body: string;
  location: string | null;
  riskLevel: RiskLevel;
  action: string;
  animalId: string | null;
  caseId: string | null;
  audience: string;
  createdAt: string;
  readBy: string[];
};

export type ClusterView = {
  id: string;
  title: string;
  disease: string;
  diseaseId: string;
  riskLevel: RiskLevel;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  animalIds: string[];
  farmIds: string[];
  summary: string;
  detectedAt: string;
  status: string;
};

export type WeatherView = {
  id: string;
  villageId: string;
  date: string;
  tempC: number;
  humidity: number;
  rainfallMm: number;
  note: string | null;
};

export type TrendView = {
  id: string;
  month: string;
  districtId: string;
  disease: string;
  cases: number;
  deaths: number;
};

export type MortalityView = {
  id: string;
  animalId: string;
  cause: string;
  notes: string | null;
  occurredAt: string;
  reportedBy: string | null;
  villageId: string | null;
};

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type DistrictView = Place & { state: string };
export type BlockView = Place & { districtId: string };
export type VillageView = Place & { blockId: string; households: number };
export type FarmView = Place & {
  villageId: string;
  ownerName: string;
  ownerPhone: string | null;
  herdSize: number;
};
export type FacilityView = Place & {
  kind: string;
  districtId: string | null;
  phone: string | null;
};

export type Snapshot = {
  generatedAt: string;
  districts: DistrictView[];
  blocks: BlockView[];
  villages: VillageView[];
  farms: FarmView[];
  facilities: FacilityView[];
  animals: AnimalView[];
  cases: CaseView[];
  samples: SampleView[];
  vaccinations: VaccinationView[];
  treatments: TreatmentView[];
  alerts: AlertView[];
  clusters: ClusterView[];
  weather: WeatherView[];
  trends: TrendView[];
  mortality: MortalityView[];
  reports: ReportView[];
  timeline: TimelineView[];
};

export type AnimalDetail = {
  animal: AnimalView;
  timeline: TimelineView[];
  reports: ReportView[];
  media: MediaView[];
  vaccinations: VaccinationView[];
  treatments: TreatmentView[];
  vetReports: VetReportView[];
  samples: SampleView[];
  cases: CaseView[];
  nearby: (AnimalView & { distanceKm: number })[];
  weather: WeatherView[];
  cluster: ClusterView | null;
};
