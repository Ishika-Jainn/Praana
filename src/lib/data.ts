import { eq } from "drizzle-orm";
import { db } from "@/db";
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
import { ensureSeeded } from "@/db/seed";
import { haversine, iso } from "./format";
export { coverage } from "./metrics";
import type {
  AlertView,
  AnimalDetail,
  AnimalView,
  CaseView,
  ClusterView,
  HealthStatus,
  Lang,
  MediaView,
  MortalityView,
  ReportView,
  RiskLevel,
  Role,
  SampleStatus,
  SampleView,
  Sex,
  Snapshot,
  Species,
  TimelineView,
  TreatmentView,
  TriageResult,
  UserView,
  VaccinationView,
  VetReportView,
  WeatherView,
} from "./types";

function asTri(value: unknown): TriageResult | null {
  if (!value || typeof value !== "object") return null;
  return value as TriageResult;
}

export function mapUser(row: typeof users.$inferSelect): UserView {
  return {
    id: row.id,
    name: row.name,
    role: row.role as Role,
    phone: row.phone,
    email: row.email,
    title: row.title,
    language: (row.language as Lang) || "en",
    farmId: row.farmId,
    villageId: row.villageId,
    blockId: row.blockId,
    districtId: row.districtId,
  };
}

export async function getUser(id: string) {
  await ensureSeeded();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? mapUser(row) : null;
}

export async function listUsers() {
  await ensureSeeded();
  const rows = await db.select().from(users);
  return rows.map(mapUser);
}

export async function getSnapshot(): Promise<Snapshot> {
  await ensureSeeded();
  const [
    districtRows,
    blockRows,
    villageRows,
    farmRows,
    facilityRows,
    animalRows,
    caseRows,
    sampleRows,
    vaxRows,
    txRows,
    alertRows,
    clusterRows,
    weatherRows,
    trendRows,
    deathRows,
    reportRows,
    timelineRows,
  ] = await Promise.all([
    db.select().from(districts),
    db.select().from(blocks),
    db.select().from(villages),
    db.select().from(farms),
    db.select().from(facilities),
    db.select().from(animals),
    db.select().from(cases),
    db.select().from(labSamples),
    db.select().from(vaccinations),
    db.select().from(treatments),
    db.select().from(alerts),
    db.select().from(clusters),
    db.select().from(weatherReadings),
    db.select().from(diseaseTrends),
    db.select().from(mortalityEvents),
    db.select().from(reports),
    db.select().from(timelineEvents),
  ]);

  const districtMap = new Map(districtRows.map((d) => [d.id, d]));
  const blockMap = new Map(blockRows.map((d) => [d.id, d]));
  const villageMap = new Map(villageRows.map((d) => [d.id, d]));
  const farmMap = new Map(farmRows.map((d) => [d.id, d]));
  const openCases = caseRows.filter((c) => !["closed", "rejected"].includes(c.status));

  const animalViews: AnimalView[] = animalRows.map((a) => {
    const farm = farmMap.get(a.farmId);
    const village = farm ? villageMap.get(farm.villageId) : undefined;
    const block = village ? blockMap.get(village.blockId) : undefined;
    const district = block ? districtMap.get(block.districtId) : undefined;
    const open = openCases.find((c) => c.animalId === a.id);
    return {
      id: a.id,
      name: a.name,
      species: a.species as Species,
      breed: a.breed,
      sex: a.sex as Sex,
      ageMonths: a.ageMonths,
      weightKg: a.weightKg,
      status: a.status as HealthStatus,
      riskLevel: a.riskLevel as RiskLevel,
      suspectedCondition: a.suspectedCondition,
      confirmedCondition: a.confirmedCondition,
      affectedRegions: a.affectedRegions || [],
      lastExamAt: iso(a.lastExamAt),
      lastVaccinationAt: iso(a.lastVaccinationAt),
      milkYieldL: a.milkYieldL,
      pregnant: a.pregnant,
      updatedAt: iso(a.updatedAt) || new Date().toISOString(),
      farmId: a.farmId,
      farmName: farm?.name || "Farm",
      ownerName: farm?.ownerName || "Owner",
      ownerPhone: farm?.ownerPhone ?? null,
      villageId: village?.id || "",
      villageName: village?.name || "",
      blockId: block?.id || "",
      blockName: block?.name || "",
      districtId: district?.id || "",
      districtName: district?.name || "",
      lat: farm?.lat || 0,
      lng: farm?.lng || 0,
      openCaseId: open?.id ?? null,
      openCaseCode: open?.caseCode ?? null,
    };
  });

  const mapCase = (c: (typeof caseRows)[number]): CaseView => ({
    id: c.id,
    caseCode: c.caseCode,
    animalId: c.animalId,
    status: c.status as CaseView["status"],
    riskLevel: c.riskLevel as RiskLevel,
    suspected: c.suspected,
    assignedVetId: c.assignedVetId,
    assignedVetName: c.assignedVetName,
    summary: c.summary,
    openedAt: iso(c.openedAt) || new Date().toISOString(),
    closedAt: iso(c.closedAt),
  });

  const mapSample = (s: (typeof sampleRows)[number]): SampleView => ({
    id: s.id,
    sampleCode: s.sampleCode,
    animalId: s.animalId,
    caseId: s.caseId,
    sampleType: s.sampleType,
    collectedAt: iso(s.collectedAt) || new Date().toISOString(),
    collector: s.collector,
    labName: s.labName,
    testName: s.testName,
    status: s.status as SampleStatus,
    result: s.result,
    resultNote: s.resultNote,
    resultAt: iso(s.resultAt),
  });

  return {
    generatedAt: new Date().toISOString(),
    districts: districtRows.map((d) => ({ id: d.id, name: d.name, state: d.state, lat: d.lat, lng: d.lng })),
    blocks: blockRows.map((d) => ({ id: d.id, name: d.name, districtId: d.districtId, lat: d.lat, lng: d.lng })),
    villages: villageRows.map((d) => ({ id: d.id, name: d.name, blockId: d.blockId, lat: d.lat, lng: d.lng, households: d.households })),
    farms: farmRows.map((d) => ({ id: d.id, name: d.name, villageId: d.villageId, ownerName: d.ownerName, ownerPhone: d.ownerPhone, lat: d.lat, lng: d.lng, herdSize: d.herdSize })),
    facilities: facilityRows.map((d) => ({ id: d.id, name: d.name, kind: d.kind, districtId: d.districtId, lat: d.lat, lng: d.lng, phone: d.phone })),
    animals: animalViews.sort((a, b) => a.name.localeCompare(b.name)),
    cases: caseRows.map(mapCase).sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
    samples: sampleRows.map(mapSample).sort((a, b) => b.collectedAt.localeCompare(a.collectedAt)),
    vaccinations: vaxRows.map((v): VaccinationView => ({
      id: v.id,
      animalId: v.animalId,
      vaccine: v.vaccine,
      dose: v.dose,
      batch: v.batch,
      givenAt: iso(v.givenAt) || new Date().toISOString(),
      nextDue: iso(v.nextDue),
      vetName: v.vetName,
      status: v.status,
    })),
    treatments: txRows.map((t): TreatmentView => ({
      id: t.id,
      animalId: t.animalId,
      caseId: t.caseId,
      condition: t.condition,
      medicine: t.medicine,
      dosage: t.dosage,
      frequency: t.frequency,
      startDate: iso(t.startDate) || new Date().toISOString(),
      endDate: iso(t.endDate),
      vetName: t.vetName,
      response: t.response,
      followUp: iso(t.followUp),
      status: t.status,
    })),
    alerts: alertRows
      .map((a): AlertView => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body,
        location: a.location,
        riskLevel: a.riskLevel as RiskLevel,
        action: a.action,
        animalId: a.animalId,
        caseId: a.caseId,
        audience: a.audience,
        createdAt: iso(a.createdAt) || new Date().toISOString(),
        readBy: a.readBy || [],
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    clusters: clusterRows.map((c): ClusterView => ({
      id: c.id,
      title: c.title,
      disease: c.disease,
      diseaseId: c.diseaseId,
      riskLevel: c.riskLevel as RiskLevel,
      radiusKm: c.radiusKm,
      centerLat: c.centerLat,
      centerLng: c.centerLng,
      animalIds: c.animalIds,
      farmIds: c.farmIds,
      summary: c.summary,
      detectedAt: iso(c.detectedAt) || new Date().toISOString(),
      status: c.status,
    })),
    weather: weatherRows.map((w): WeatherView => ({
      id: w.id,
      villageId: w.villageId,
      date: iso(w.date) || new Date().toISOString(),
      tempC: w.tempC,
      humidity: w.humidity,
      rainfallMm: w.rainfallMm,
      note: w.note,
    })),
    trends: trendRows.map((t) => ({
      id: t.id,
      month: t.month,
      districtId: t.districtId,
      disease: t.disease,
      cases: t.cases,
      deaths: t.deaths,
    })),
    mortality: deathRows.map((m): MortalityView => ({
      id: m.id,
      animalId: m.animalId,
      cause: m.cause,
      notes: m.notes,
      occurredAt: iso(m.occurredAt) || new Date().toISOString(),
      reportedBy: m.reportedBy,
      villageId: m.villageId,
    })),
    reports: reportRows.map((r): ReportView => ({
      id: r.id,
      animalId: r.animalId,
      caseId: r.caseId,
      reporterName: r.reporterName,
      symptoms: r.symptoms || [],
      regions: r.regions || [],
      severity: r.severity,
      duration: r.duration,
      notes: r.notes,
      voiceTranscript: r.voiceTranscript,
      language: r.language,
      triage: asTri(r.triage),
      createdAt: iso(r.createdAt) || new Date().toISOString(),
      syncStatus: r.syncStatus,
    })),
    timeline: timelineRows
      .map((t): TimelineView => ({
        id: t.id,
        animalId: t.animalId,
        caseId: t.caseId,
        type: t.type,
        title: t.title,
        detail: t.detail,
        actor: t.actor,
        occurredAt: iso(t.occurredAt) || new Date().toISOString(),
      }))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
  };
}

export function visibleAnimals(user: UserView, animalsIn: AnimalView[]) {
  if (user.role === "farmer" && user.farmId) return animalsIn.filter((a) => a.farmId === user.farmId);
  if (user.role === "field" && user.blockId) return animalsIn.filter((a) => a.blockId === user.blockId);
  if (user.role === "vet" && user.districtId) return animalsIn.filter((a) => a.districtId === user.districtId);
  return animalsIn;
}

export function visibleAlerts(user: UserView, snapshot: Snapshot) {
  const mine = new Set(visibleAnimals(user, snapshot.animals).map((a) => a.id));
  return snapshot.alerts.filter((a) => {
    if (user.role === "farmer") {
      if (a.audience !== "farmer" && a.audience !== "all") return false;
      return !a.animalId || mine.has(a.animalId);
    }
    if (a.audience === "all") return true;
    if (a.audience === user.role) return true;
    if (user.role === "government") return true;
    if (a.animalId && mine.has(a.animalId) && (user.role === "field" || user.role === "vet") && a.audience !== "farmer") return true;
    return false;
  });
}

export async function getAnimalDetail(id: string): Promise<AnimalDetail | null> {
  const snap = await getSnapshot();
  const animal = snap.animals.find((a) => a.id === id);
  if (!animal) return null;
  const mediaRows = await db.select().from(mediaAssets).where(eq(mediaAssets.animalId, id));
  const vetRows = await db.select().from(vetReports).where(eq(vetReports.animalId, id));
  const nearby = snap.animals
    .filter((a) => a.id !== id)
    .map((a) => ({ ...a, distanceKm: haversine(animal, a) }))
    .filter((a) => a.distanceKm <= 8)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const cluster = snap.clusters.find((c) => c.animalIds.includes(id) && c.status !== "contained") || snap.clusters.find((c) => c.animalIds.includes(id)) || null;
  return {
    animal,
    timeline: snap.timeline.filter((t) => t.animalId === id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    reports: snap.reports.filter((r) => r.animalId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    media: mediaRows
      .map((m): MediaView => ({
        id: m.id,
        animalId: m.animalId,
        reportId: m.reportId,
        kind: m.kind,
        region: m.region,
        caption: m.caption,
        url: m.url,
        capturedAt: iso(m.capturedAt) || new Date().toISOString(),
        reporterName: m.reporterName,
      }))
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    vaccinations: snap.vaccinations.filter((v) => v.animalId === id).sort((a, b) => b.givenAt.localeCompare(a.givenAt)),
    treatments: snap.treatments.filter((t) => t.animalId === id).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    vetReports: vetRows
      .map((v): VetReportView => ({
        id: v.id,
        animalId: v.animalId,
        caseId: v.caseId,
        vetName: v.vetName,
        findings: v.findings,
        suspectedDx: v.suspectedDx,
        recommendations: v.recommendations,
        examinedAt: iso(v.examinedAt) || new Date().toISOString(),
      }))
      .sort((a, b) => b.examinedAt.localeCompare(a.examinedAt)),
    samples: snap.samples.filter((s) => s.animalId === id),
    cases: snap.cases.filter((c) => c.animalId === id),
    nearby,
    weather: snap.weather.filter((w) => w.villageId === animal.villageId).sort((a, b) => a.date.localeCompare(b.date)),
    cluster,
  };
}


