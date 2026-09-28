import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const districts = pgTable("districts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const blocks = pgTable("blocks", {
  id: text("id").primaryKey(),
  districtId: text("district_id").notNull(),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const villages = pgTable("villages", {
  id: text("id").primaryKey(),
  blockId: text("block_id").notNull(),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  households: integer("households").notNull(),
});

export const farms = pgTable("farms", {
  id: text("id").primaryKey(),
  villageId: text("village_id").notNull(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  herdSize: integer("herd_size").notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  title: text("title"),
  language: text("language").notNull().default("en"),
  passwordHash: text("password_hash"),
  farmId: text("farm_id"),
  villageId: text("village_id"),
  blockId: text("block_id"),
  districtId: text("district_id"),
});

export const facilities = pgTable("facilities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  districtId: text("district_id"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  phone: text("phone"),
});

export const animals = pgTable("animals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed").notNull(),
  sex: text("sex").notNull(),
  ageMonths: integer("age_months").notNull(),
  weightKg: real("weight_kg").notNull(),
  farmId: text("farm_id").notNull(),
  status: text("status").notNull(),
  riskLevel: text("risk_level").notNull(),
  suspectedCondition: text("suspected_condition"),
  confirmedCondition: text("confirmed_condition"),
  affectedRegions: jsonb("affected_regions").$type<string[]>().notNull(),
  lastExamAt: timestamp("last_exam_at", { mode: "date" }),
  lastVaccinationAt: timestamp("last_vaccination_at", { mode: "date" }),
  milkYieldL: real("milk_yield_l"),
  pregnant: boolean("pregnant").notNull().default(false),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const timelineEvents = pgTable("timeline_events", {
  id: text("id").primaryKey(),
  animalId: text("animal_id").notNull(),
  caseId: text("case_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  detail: text("detail"),
  actor: text("actor"),
  occurredAt: timestamp("occurred_at", { mode: "date" }).notNull(),
});

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  animalId: text("animal_id").notNull(),
  caseId: text("case_id"),
  reporterId: text("reporter_id"),
  reporterName: text("reporter_name"),
  symptoms: jsonb("symptoms").$type<string[]>().notNull(),
  regions: jsonb("regions").$type<string[]>().notNull(),
  severity: text("severity").notNull(),
  duration: text("duration"),
  notes: text("notes"),
  voiceTranscript: text("voice_transcript"),
  language: text("language"),
  triage: jsonb("triage").$type<Record<string, unknown>>(),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  syncStatus: text("sync_status").notNull().default("synced"),
});

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  animalId: text("animal_id").notNull(),
  reportId: text("report_id"),
  kind: text("kind").notNull(),
  region: text("region"),
  caption: text("caption"),
  url: text("url").notNull(),
  capturedAt: timestamp("captured_at", { mode: "date" }).notNull(),
  lat: real("lat"),
  lng: real("lng"),
  reporterName: text("reporter_name"),
});

export const vaccinations = pgTable("vaccinations", {
  id: text("id").primaryKey(),
  animalId: text("animal_id").notNull(),
  vaccine: text("vaccine").notNull(),
  dose: text("dose").notNull(),
  batch: text("batch").notNull(),
  givenAt: timestamp("given_at", { mode: "date" }).notNull(),
  nextDue: timestamp("next_due", { mode: "date" }),
  vetName: text("vet_name").notNull(),
  status: text("status").notNull(),
});

export const treatments = pgTable("treatments", {
  id: text("id").primaryKey(),
  animalId: text("animal_id").notNull(),
  caseId: text("case_id"),
  condition: text("condition").notNull(),
  medicine: text("medicine").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  vetName: text("vet_name").notNull(),
  response: text("response"),
  followUp: timestamp("follow_up", { mode: "date" }),
  status: text("status").notNull(),
});

export const vetReports = pgTable("vet_reports", {
  id: text("id").primaryKey(),
  animalId: text("animal_id").notNull(),
  caseId: text("case_id"),
  vetId: text("vet_id"),
  vetName: text("vet_name").notNull(),
  findings: text("findings").notNull(),
  suspectedDx: text("suspected_dx"),
  recommendations: text("recommendations"),
  examinedAt: timestamp("examined_at", { mode: "date" }).notNull(),
});

export const labSamples = pgTable("lab_samples", {
  id: text("id").primaryKey(),
  sampleCode: text("sample_code").notNull(),
  animalId: text("animal_id").notNull(),
  caseId: text("case_id"),
  sampleType: text("sample_type").notNull(),
  collectedAt: timestamp("collected_at", { mode: "date" }).notNull(),
  collector: text("collector").notNull(),
  labName: text("lab_name").notNull(),
  testName: text("test_name").notNull(),
  status: text("status").notNull(),
  result: text("result"),
  resultNote: text("result_note"),
  resultAt: timestamp("result_at", { mode: "date" }),
});

export const cases = pgTable("cases", {
  id: text("id").primaryKey(),
  caseCode: text("case_code").notNull(),
  animalId: text("animal_id").notNull(),
  status: text("status").notNull(),
  riskLevel: text("risk_level").notNull(),
  suspected: text("suspected"),
  assignedVetId: text("assigned_vet_id"),
  assignedVetName: text("assigned_vet_name"),
  summary: text("summary"),
  openedAt: timestamp("opened_at", { mode: "date" }).notNull(),
  closedAt: timestamp("closed_at", { mode: "date" }),
});

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  location: text("location"),
  riskLevel: text("risk_level").notNull(),
  action: text("action").notNull(),
  animalId: text("animal_id"),
  caseId: text("case_id"),
  audience: text("audience").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  readBy: jsonb("read_by").$type<string[]>().notNull(),
});

export const clusters = pgTable("clusters", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  disease: text("disease").notNull(),
  diseaseId: text("disease_id").notNull(),
  riskLevel: text("risk_level").notNull(),
  radiusKm: real("radius_km").notNull(),
  centerLat: real("center_lat").notNull(),
  centerLng: real("center_lng").notNull(),
  animalIds: jsonb("animal_ids").$type<string[]>().notNull(),
  farmIds: jsonb("farm_ids").$type<string[]>().notNull(),
  summary: text("summary").notNull(),
  detectedAt: timestamp("detected_at", { mode: "date" }).notNull(),
  status: text("status").notNull(),
});

export const weatherReadings = pgTable("weather_readings", {
  id: text("id").primaryKey(),
  villageId: text("village_id").notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  tempC: real("temp_c").notNull(),
  humidity: integer("humidity").notNull(),
  rainfallMm: real("rainfall_mm").notNull(),
  note: text("note"),
});

export const diseaseTrends = pgTable("disease_trends", {
  id: text("id").primaryKey(),
  month: text("month").notNull(),
  districtId: text("district_id").notNull(),
  disease: text("disease").notNull(),
  cases: integer("cases").notNull(),
  deaths: integer("deaths").notNull(),
});

export const mortalityEvents = pgTable("mortality_events", {
  id: text("id").primaryKey(),
  animalId: text("animal_id").notNull(),
  cause: text("cause").notNull(),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at", { mode: "date" }).notNull(),
  reportedBy: text("reported_by"),
  villageId: text("village_id"),
});
