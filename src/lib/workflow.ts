import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  alerts,
  animals,
  cases,
  clusters,
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
import { DISEASES, type DiseaseId } from "./catalog";
import { assessRisk } from "./triage";
import {
  caseCodeFromCount,
  haversine,
  sampleCodeFromCount,
  uid,
} from "./format";
import type { RiskLevel, Species } from "./types";

const OPEN = ["reported", "triaged", "assigned", "examined", "sampled", "tested", "confirmed", "treated"];
const RANK: Record<string, number> = { low: 0, moderate: 1, high: 2, critical: 3 };

function diseaseIdFromName(name: string | null | undefined): DiseaseId | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("foot") || n.includes("fmd")) return "fmd";
  if (n.includes("haemorrhagic") || n.includes("hemorrhagic") || n.includes("septicaemia")) return "hs";
  if (n.includes("lumpy") || n.includes("lsd")) return "lsd";
  if (n.includes("mastitis")) return "mastitis";
  if (n.includes("theiler")) return "theileriosis";
  if (n.includes("black quarter") || n === "bq" || n.includes("एकंग")) return "bq";
  if (n.includes("petits") || n.includes("ppr")) return "ppr";
  if (n.includes("swine fever") || n.includes("asf")) return "asf";
  if (n.includes("newcastle") || n.includes("ranikhet")) return "newcastle";
  return null;
}

async function addEvent(input: {
  animalId: string;
  caseId?: string | null;
  type: string;
  title: string;
  detail?: string | null;
  actor?: string | null;
  occurredAt?: Date;
}) {
  await db.insert(timelineEvents).values({
    id: uid("evt"),
    animalId: input.animalId,
    caseId: input.caseId ?? null,
    type: input.type,
    title: input.title,
    detail: input.detail ?? null,
    actor: input.actor ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  });
}

async function addAlert(input: {
  type: string;
  title: string;
  body: string;
  location?: string | null;
  riskLevel: RiskLevel;
  action: string;
  animalId?: string | null;
  caseId?: string | null;
  audience: string;
}) {
  await db.insert(alerts).values({
    id: uid("alt"),
    type: input.type,
    title: input.title,
    body: input.body,
    location: input.location ?? null,
    riskLevel: input.riskLevel,
    action: input.action,
    animalId: input.animalId ?? null,
    caseId: input.caseId ?? null,
    audience: input.audience,
    createdAt: new Date(),
    readBy: [],
  });
}

export async function refreshClusters() {
  const animalRows = await db.select().from(animals);
  const farmRows = await db.select().from(farms);
  const villageRows = await db.select().from(villages);
  const farmMap = new Map(farmRows.map((f) => [f.id, f]));
  const active = animalRows.filter(
    (a) => a.status === "suspected" || a.status === "confirmed",
  );

  const groups = new Map<DiseaseId, typeof active>();
  for (const animal of active) {
    const id = diseaseIdFromName(animal.confirmedCondition || animal.suspectedCondition);
    if (!id || id === "nonspecific") continue;
    const list = groups.get(id) || [];
    list.push(animal);
    groups.set(id, list);
  }

  for (const [diseaseId, group] of groups) {
    let best: typeof group = [];
    for (const origin of group) {
      const farm = farmMap.get(origin.farmId);
      if (!farm) continue;
      const neighbors = group.filter((other) => {
        const of = farmMap.get(other.farmId);
        if (!of) return false;
        return haversine(farm, of) <= 5;
      });
      if (neighbors.length > best.length) best = neighbors;
    }
    const farmIds = [...new Set(best.map((a) => a.farmId))];
    const existing = await db
      .select()
      .from(clusters)
      .where(and(eq(clusters.diseaseId, diseaseId), notInArray(clusters.status, ["contained"])));

    if (best.length >= 5 && farmIds.length >= 3) {
      const center = best.reduce(
        (acc, a) => {
          const f = farmMap.get(a.farmId)!;
          acc.lat += f.lat;
          acc.lng += f.lng;
          return acc;
        },
        { lat: 0, lng: 0 },
      );
      center.lat /= best.length;
      center.lng /= best.length;
      const disease = DISEASES[diseaseId];
      const summary = `${best.length} ${disease.short} pattern cases across ${farmIds.length} farms within 5 km.`;
      const title = `Potential ${disease.short} cluster — ${villageRows.find((v) => v.id === farmMap.get(best[0].farmId)?.villageId)?.name || "local belt"}`;
      const payload = {
        title,
        disease: disease.name,
        diseaseId,
        riskLevel: best.some((a) => a.riskLevel === "critical" || a.status === "confirmed") ? "critical" : "high",
        radiusKm: 5,
        centerLat: center.lat,
        centerLng: center.lng,
        animalIds: best.map((a) => a.id),
        farmIds,
        summary,
        status: "active",
      };
      if (existing[0]) {
        await db.update(clusters).set(payload).where(eq(clusters.id, existing[0].id));
      } else {
        await db.insert(clusters).values({
          id: `CLU-${diseaseId.toUpperCase()}-LIVE`,
          detectedAt: new Date(),
          ...payload,
        });
        await addAlert({
          type: "cluster",
          title: "Potential disease cluster detected",
          body: summary,
          location: title,
          riskLevel: "critical",
          action: "Open the risk map, verify the index farms, and hold animal movement in the belt.",
          audience: "government",
        });
        await addAlert({
          type: "cluster",
          title: "Cluster watch — field verification needed",
          body: summary,
          location: title,
          riskLevel: "high",
          action: "Visit each listed farm today and examine in-contact animals.",
          audience: "field",
        });
      }
    }
  }
}

export async function createHealthReport(input: {
  animalId: string;
  reporterId?: string | null;
  reporterName?: string | null;
  symptoms: string[];
  regions: string[];
  severity: string;
  duration?: string | null;
  notes?: string | null;
  voiceTranscript?: string | null;
  language?: string | null;
  photos?: { region?: string | null; caption?: string | null; dataUrl: string }[];
  documents?: { kind?: string; caption?: string | null; dataUrl: string }[];
  lat?: number | null;
  lng?: number | null;
}) {
  const [animal] = await db.select().from(animals).where(eq(animals.id, input.animalId));
  if (!animal) return { ok: false as const, error: "Animal not found" };
  if (animal.status === "deceased") return { ok: false as const, error: "This animal is recorded as deceased" };

  const [farm] = await db.select().from(farms).where(eq(farms.id, animal.farmId));
  const [village] = farm ? await db.select().from(villages).where(eq(villages.id, farm.villageId)) : [undefined];
  const vax = await db.select().from(vaccinations).where(eq(vaccinations.animalId, animal.id));
  const weather = village
    ? await db.select().from(weatherReadings).where(eq(weatherReadings.villageId, village.id))
    : [];
  const latestWeather = weather.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const allAnimals = await db.select().from(animals);
  const allFarms = await db.select().from(farms);
  const farmMap = new Map(allFarms.map((f) => [f.id, f]));
  const origin = farmMap.get(animal.farmId);
  const nearby = allAnimals.filter((other) => {
    if (other.id === animal.id || !origin) return false;
    const of = farmMap.get(other.farmId);
    if (!of) return false;
    return haversine(origin, of) <= 5 && (other.status === "suspected" || other.status === "confirmed");
  });
  const deaths = await db.select().from(mortalityEvents);
  const nearbyMortality = deaths.filter((d) => {
    if (!origin || !d.villageId || !village) return false;
    return d.villageId === village.id && Date.now() - d.occurredAt.getTime() < 1000 * 60 * 60 * 24 * 45;
  }).length;

  const vaccinatedAgainst = [
    ...new Set(
      vax
        .filter((v) => Date.now() - v.givenAt.getTime() < 1000 * 60 * 60 * 24 * 180)
        .map((v) => v.vaccine),
    ),
  ];

  const triage = assessRisk({
    symptoms: input.symptoms,
    regions: input.regions,
    species: animal.species as Species,
    ageMonths: animal.ageMonths,
    vaccinatedAgainst,
    history: [diseaseIdFromName(animal.confirmedCondition || animal.suspectedCondition)].filter(Boolean) as string[],
    nearbySame: nearby.length,
    nearbyMortality,
    humidity: latestWeather?.humidity ?? 60,
    rainfallMm: latestWeather?.rainfallMm ?? 0,
    photoRegions: (input.photos || []).map((p) => p.region).filter(Boolean) as string[],
  });

  const reportId = uid("rpt");
  const now = new Date();
  const open = await db
    .select()
    .from(cases)
    .where(eq(cases.animalId, animal.id));
  const current = open.find((c) => OPEN.includes(c.status));
  let caseId = current?.id ?? null;
  let caseCode = current?.caseCode ?? null;

  if (!current && (triage.riskLevel !== "low" || input.symptoms.length > 0)) {
    const count = open.length + 430;
    caseId = uid("case");
    caseCode = caseCodeFromCount(count);

    // Dynamic vet lookup: find vet in the animal's block, falling back gracefully
    const vetUsers = await db.select().from(users).where(eq(users.role, "vet"));
    const localVet =
      vetUsers.find((v) => v.blockId && village?.blockId && v.blockId === village.blockId) ||
      vetUsers[0];
    const assignedVetId = localVet?.id || "u-ananya";
    const assignedVetName = localVet?.name || "Dr. Ananya Kulkarni";

    await db.insert(cases).values({
      id: caseId,
      caseCode,
      animalId: animal.id,
      status: "triaged",
      riskLevel: triage.riskLevel,
      suspected: triage.possibleCondition,
      assignedVetId,
      assignedVetName,
      summary: input.notes || triage.evidence.slice(0, 3).join(" · "),
      openedAt: now,
      closedAt: null,
    });
  } else if (current) {
    const nextRisk = RANK[triage.riskLevel] > RANK[current.riskLevel] ? triage.riskLevel : current.riskLevel;
    await db
      .update(cases)
      .set({
        riskLevel: nextRisk,
        suspected: current.status === "confirmed" ? current.suspected : triage.possibleCondition,
        summary: input.notes || current.summary,
        status: current.status === "reported" ? "triaged" : current.status,
      })
      .where(eq(cases.id, current.id));
  }

  await db.insert(reports).values({
    id: reportId,
    animalId: animal.id,
    caseId,
    reporterId: input.reporterId ?? null,
    reporterName: input.reporterName ?? null,
    symptoms: input.symptoms,
    regions: input.regions,
    severity: input.severity,
    duration: input.duration ?? null,
    notes: input.notes ?? null,
    voiceTranscript: input.voiceTranscript ?? null,
    language: input.language ?? "en",
    triage: triage as unknown as Record<string, unknown>,
    lat: input.lat ?? farm?.lat ?? null,
    lng: input.lng ?? farm?.lng ?? null,
    createdAt: now,
    syncStatus: "synced",
  });

  for (const photo of input.photos || []) {
    if (!photo.dataUrl) continue;
    await db.insert(mediaAssets).values({
      id: uid("med"),
      animalId: animal.id,
      reportId,
      kind: "photo",
      region: photo.region ?? null,
      caption: photo.caption ?? "Field photograph",
      url: photo.dataUrl,
      capturedAt: now,
      lat: input.lat ?? farm?.lat ?? null,
      lng: input.lng ?? farm?.lng ?? null,
      reporterName: input.reporterName ?? null,
    });
  }
  for (const doc of input.documents || []) {
    if (!doc.dataUrl) continue;
    await db.insert(mediaAssets).values({
      id: uid("med"),
      animalId: animal.id,
      reportId,
      kind: doc.kind || "document",
      region: null,
      caption: doc.caption ?? "Supporting document",
      url: doc.dataUrl,
      capturedAt: now,
      lat: farm?.lat ?? null,
      lng: farm?.lng ?? null,
      reporterName: input.reporterName ?? null,
    });
  }

  const keepConfirmed = animal.status === "confirmed";
  const nextStatus = keepConfirmed
    ? "confirmed"
    : triage.riskLevel === "high" || triage.riskLevel === "critical"
      ? "suspected"
      : triage.riskLevel === "moderate" || input.symptoms.length
        ? "observation"
        : animal.status;
  const regions = [...new Set([...(animal.affectedRegions || []), ...input.regions])];

  await db
    .update(animals)
    .set({
      status: nextStatus,
      riskLevel: keepConfirmed && RANK[animal.riskLevel] > RANK[triage.riskLevel] ? animal.riskLevel : triage.riskLevel,
      suspectedCondition: keepConfirmed ? animal.suspectedCondition : triage.possibleCondition,
      affectedRegions: regions,
      updatedAt: now,
    })
    .where(eq(animals.id, animal.id));

  await addEvent({
    animalId: animal.id,
    caseId,
    type: "report",
    title: "Field report submitted",
    detail: input.voiceTranscript || input.notes || input.symptoms.join(", "),
    actor: input.reporterName || "Field report",
  });
  await addEvent({
    animalId: animal.id,
    caseId,
    type: "triage",
    title: `Triage · possible ${triage.possibleCondition}`,
    detail: `${triage.riskLevel} risk. ${triage.disclaimer}`,
    actor: "Praana rule engine",
  });

  const location = [farm?.name, village?.name].filter(Boolean).join(", ");
  if (triage.riskLevel === "high" || triage.riskLevel === "critical") {
    await addAlert({
      type: "suspected",
      title: `Possible ${triage.possibleCondition} — ${animal.name}`,
      body: `${animal.name} (${animal.id}) was reported with a ${triage.riskLevel} risk pattern. ${triage.evidence.slice(0, 3).join("; ")}.`,
      location,
      riskLevel: triage.riskLevel,
      action: triage.nextSteps.slice(0, 3).join(" → "),
      animalId: animal.id,
      caseId,
      audience: "vet",
    });
    await addAlert({
      type: "suspected",
      title: `High-risk report in ${village?.name || "the belt"}`,
      body: `${animal.name} at ${farm?.name} needs verification. Pattern: possible ${triage.possibleCondition}.`,
      location,
      riskLevel: triage.riskLevel,
      action: "Assign examination and consider movement restriction if neighbouring sheds match.",
      animalId: animal.id,
      caseId,
      audience: "government",
    });
    await addAlert({
      type: "advisory",
      title: `${animal.name}: possible ${DISEASES[triage.diseaseId as DiseaseId]?.hi || triage.possibleCondition}`,
      body: DISEASES[triage.diseaseId as DiseaseId]?.advisory.hi || triage.disclaimer,
      location,
      riskLevel: triage.riskLevel,
      action: "पशु को अलग रखें और पशु चिकित्सक को बुलाएँ।",
      animalId: animal.id,
      caseId,
      audience: "farmer",
    });
  }

  await refreshClusters();

  return {
    ok: true as const,
    reportId,
    caseId,
    caseCode,
    triage,
    animalId: animal.id,
    status: nextStatus,
  };
}

export async function performAction(
  type: string,
  payload: Record<string, unknown>,
  actor?: { id: string; name: string; role?: string; farmId?: string | null }
) {
  const role = actor?.role;

  // Zero-trust server-side permission gates:
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    examine: ["vet", "government"],
    request_sample: ["vet", "government"],
    start_treatment: ["vet", "government"],
    schedule_followup: ["vet", "government"],
    advance_sample: ["lab", "government"],
    record_result: ["lab", "government"],
    reject_sample: ["lab", "government"],
    add_vaccination: ["vet", "field", "government"], // paravets and vets only
    close_case: ["vet", "government"],
    escalate: ["field", "vet", "government"],
    forward_case: ["field", "government"],
    update_case_status: ["vet", "government"],
    record_monitoring: ["vet", "field", "government"],
    issue_advisory: ["government"],
    cluster_action: ["government"],
    register_animal: ["farmer", "field", "vet", "government"],
    report_mortality: ["farmer", "field", "vet", "government"],
    mark_alert_read: ["farmer", "field", "vet", "lab", "government"],
  };

  if (role && ROLE_PERMISSIONS[type] && !ROLE_PERMISSIONS[type].includes(role)) {
    return {
      ok: false as const,
      error: `Access Denied: Your role (${role}) is not authorized to perform '${type}'. Required: ${ROLE_PERMISSIONS[type].join(" or ")}.`,
    };
  }

  const now = new Date();
  if (type === "examine") {
    const caseId = String(payload.caseId || "");
    const animalId = String(payload.animalId || "");
    const findings = String(payload.findings || "");
    const suspectedDx = String(payload.suspectedDx || "");
    const recommendations = String(payload.recommendations || "");
    if (!animalId || !findings) return { ok: false as const, error: "Findings are required" };
    const id = uid("vet");
    await db.insert(vetReports).values({
      id,
      animalId,
      caseId: caseId || null,
      vetId: actor?.id ?? null,
      vetName: actor?.name || String(payload.vetName || "Veterinarian"),
      findings,
      suspectedDx: suspectedDx || null,
      recommendations: recommendations || null,
      examinedAt: now,
    });
    if (caseId) {
      const [c] = await db.select().from(cases).where(eq(cases.id, caseId));
      const keep = c && ["sampled", "tested", "confirmed", "treated", "closed"].includes(c.status);
      await db
        .update(cases)
        .set({
          status: keep ? c.status : "examined",
          suspected: suspectedDx || c?.suspected,
          assignedVetId: actor?.id || c?.assignedVetId,
          assignedVetName: actor?.name || c?.assignedVetName,
        })
        .where(eq(cases.id, caseId));
    }
    await db.update(animals).set({ lastExamAt: now, updatedAt: now, suspectedCondition: suspectedDx || undefined }).where(eq(animals.id, animalId));
    await addEvent({
      animalId,
      caseId,
      type: "exam",
      title: "Veterinary examination",
      detail: findings,
      actor: actor?.name || "Veterinarian",
    });
    return { ok: true as const, message: "Examination saved on the digital twin.", href: `/console/animals/${animalId}` };
  }

  if (type === "request_sample") {
    const animalId = String(payload.animalId || "");
    const caseId = String(payload.caseId || "");
    const count = (await db.select().from(labSamples)).length + 1200;
    const id = uid("smp");
    const sampleCode = sampleCodeFromCount(count);
    await db.insert(labSamples).values({
      id,
      sampleCode,
      animalId,
      caseId: caseId || null,
      sampleType: String(payload.sampleType || "Oral epithelium"),
      collectedAt: now,
      collector: actor?.name || String(payload.collector || "Field veterinarian"),
      labName: String(payload.labName || "District Disease Investigation Lab, Satara"),
      testName: String(payload.testName || "FMD antigen ELISA + PCR"),
      status: "collected",
      result: null,
      resultNote: null,
      resultAt: null,
    });
    if (caseId) await db.update(cases).set({ status: "sampled" }).where(eq(cases.id, caseId));
    await addEvent({
      animalId,
      caseId,
      type: "sample",
      title: "Sample collected",
      detail: `${sampleCode} · ${String(payload.sampleType || "Sample")} → ${String(payload.labName || "District lab")}`,
      actor: actor?.name || "Veterinarian",
    });
    await addAlert({
      type: "lab",
      title: `Sample ${sampleCode} entering the lab chain`,
      body: `Collected from ${animalId}. Test: ${String(payload.testName || "pending protocol")}.`,
      location: String(payload.labName || "District lab"),
      riskLevel: "moderate",
      action: "Receive, log, and start the requested test.",
      animalId,
      caseId,
      audience: "lab",
    });
    return { ok: true as const, message: `Sample ${sampleCode} logged as collected.`, href: "/console/lab" };
  }

  if (type === "advance_sample") {
    const sampleId = String(payload.sampleId || "");
    const [sample] = await db.select().from(labSamples).where(eq(labSamples.id, sampleId));
    if (!sample) return { ok: false as const, error: "Sample not found" };
    const flow = ["collected", "in_transit", "received", "testing", "result_available"];
    const idx = flow.indexOf(sample.status);
    if (idx < 0 || idx >= flow.length - 1) return { ok: false as const, error: "Sample cannot be advanced" };
    const next = flow[idx + 1];
    if (next === "result_available") return { ok: false as const, error: "Record a result instead of skipping ahead" };
    await db.update(labSamples).set({ status: next }).where(eq(labSamples.id, sampleId));
    await addEvent({
      animalId: sample.animalId,
      caseId: sample.caseId,
      type: "sample",
      title: `Sample ${sample.sampleCode} · ${next.replaceAll("_", " ")}`,
      detail: sample.testName,
      actor: actor?.name || "Laboratory",
    });
    return { ok: true as const, message: `${sample.sampleCode} is now ${next.replaceAll("_", " ")}.` };
  }

  if (type === "record_result") {
    const sampleId = String(payload.sampleId || "");
    const result = String(payload.result || "");
    const note = String(payload.resultNote || "");
    const [sample] = await db.select().from(labSamples).where(eq(labSamples.id, sampleId));
    if (!sample) return { ok: false as const, error: "Sample not found" };
    const [animal] = await db.select().from(animals).where(eq(animals.id, sample.animalId));
    const positive = result === "positive";
    const condition = String(payload.condition || animal?.suspectedCondition || "the suspected condition");
    await db
      .update(labSamples)
      .set({ status: "result_available", result, resultNote: note || null, resultAt: now })
      .where(eq(labSamples.id, sampleId));
    if (sample.caseId) {
      await db
        .update(cases)
        .set({ status: positive ? "confirmed" : "rejected", suspected: condition })
        .where(eq(cases.id, sample.caseId));
    }
    if (animal) {
      await db
        .update(animals)
        .set({
          status: positive ? "confirmed" : animal.status === "confirmed" ? "confirmed" : "observation",
          riskLevel: positive ? "critical" : "moderate",
          confirmedCondition: positive ? condition : animal.confirmedCondition,
          suspectedCondition: condition,
          updatedAt: now,
        })
        .where(eq(animals.id, animal.id));
    }
    await addEvent({
      animalId: sample.animalId,
      caseId: sample.caseId,
      type: "lab",
      title: positive ? "Laboratory result · positive" : "Laboratory result · not confirmed",
      detail: `${sample.sampleCode}: ${result}. ${note}`.trim(),
      actor: actor?.name || sample.labName,
    });
    await addAlert({
      type: "lab_result",
      title: positive ? `Laboratory confirmation — ${animal?.name || sample.animalId}` : `Laboratory result available — ${animal?.name || sample.animalId}`,
      body: positive
        ? `${sample.testName} returned positive for ${condition}. Treat as confirmed and widen shed surveillance.`
        : `${sample.testName} did not confirm ${condition}. Keep under observation until the veterinarian closes the differential.`,
      location: sample.labName,
      riskLevel: positive ? "critical" : "moderate",
      action: positive
        ? "Isolate, treat under veterinary direction, and survey neighbouring farms."
        : "Review differentials and continue observation.",
      animalId: sample.animalId,
      caseId: sample.caseId,
      audience: "all",
    });
    for (const audience of ["vet", "field", "farmer"]) {
      await addAlert({
        type: "lab_result",
        title: `Result published · ${sample.sampleCode} (${animal?.name || sample.animalId})`,
        body: `${sample.testName}: ${result}. ${note}`.trim(),
        location: sample.labName,
        riskLevel: positive ? "critical" : "moderate",
        action: audience === "vet" ? "Review the result on the Digital Twin and update treatment." : audience === "field" ? "Check in-contact animals on the farm." : "Follow your veterinarian's advice.",
        animalId: sample.animalId,
        caseId: sample.caseId,
        audience,
      });
    }
    await refreshClusters();
    return { ok: true as const, message: "Result posted to the digital twin and the case file.", href: `/console/animals/${sample.animalId}` };
  }

  if (type === "reject_sample") {
    const sampleId = String(payload.sampleId || "");
    const reason = String(payload.reason || "Sample degraded / cold chain broken / hemolyzed");
    const [sample] = await db.select().from(labSamples).where(eq(labSamples.id, sampleId));
    if (!sample) return { ok: false as const, error: "Sample not found" };
    await db.update(labSamples).set({ status: "collected", result: "Rejected: resampling requested", resultNote: reason }).where(eq(labSamples.id, sampleId));
    await addEvent({
      animalId: sample.animalId,
      caseId: sample.caseId,
      type: "sample",
      title: `Sample ${sample.sampleCode} rejected by laboratory`,
      detail: `Reason: ${reason}. Please dispatch a fresh specimen under strict cold chain.`,
      actor: actor?.name || "Laboratory Analyst",
    });
    await addAlert({
      type: "lab",
      title: `Sample rejected — ${sample.sampleCode}`,
      body: `Laboratory could not process ${sample.sampleCode}. Reason: ${reason}. A fresh sample is required.`,
      location: sample.labName,
      riskLevel: "high",
      action: "Collect repeat specimen under cold-chain protocol.",
      animalId: sample.animalId,
      caseId: sample.caseId,
      audience: "vet",
    });
    return { ok: true as const, message: "Sample marked as rejected and repeat sample requested from the field team." };
  }

  if (type === "start_treatment") {
    const animalId = String(payload.animalId || "");
    const caseId = payload.caseId ? String(payload.caseId) : null;
    const days = Number(payload.days || 5);
    const withdrawalMilk = Number(payload.withdrawalMilk || 3);
    const withdrawalMeat = Number(payload.withdrawalMeat || 14);
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    const follow = new Date(now);
    follow.setDate(follow.getDate() + Math.min(3, days));
    const id = uid("tx");
    await db.insert(treatments).values({
      id,
      animalId,
      caseId,
      condition: String(payload.condition || "Clinical syndrome"),
      medicine: String(payload.medicine || ""),
      dosage: String(payload.dosage || ""),
      frequency: String(payload.frequency || "Once daily"),
      startDate: now,
      endDate: end,
      vetName: actor?.name || "Veterinarian",
      response: String(payload.response || `Just started (Milk withdrawal: ${withdrawalMilk}d, Meat: ${withdrawalMeat}d)`),
      followUp: follow,
      status: "active",
    });
    if (caseId) await db.update(cases).set({ status: "treated" }).where(eq(cases.id, caseId));
    const [animal] = await db.select().from(animals).where(eq(animals.id, animalId));
    if (animal && animal.status !== "confirmed" && animal.status !== "deceased") {
      await db.update(animals).set({ status: animal.status === "suspected" ? "suspected" : "recovering", updatedAt: now }).where(eq(animals.id, animalId));
    } else if (animal) {
      await db.update(animals).set({ updatedAt: now }).where(eq(animals.id, animalId));
    }
    await addEvent({
      animalId,
      caseId,
      type: "treatment",
      title: "Treatment prescribed",
      detail: `${payload.medicine} · ${payload.dosage} · ${payload.frequency} · Milk withholding: ${withdrawalMilk} days`,
      actor: actor?.name || "Veterinarian",
    });
    await addAlert({
      type: "followup",
      title: `Follow-up due — ${animal?.name || animalId}`,
      body: `Review response to ${String(payload.medicine)} on the next visit.`,
      location: null,
      riskLevel: "moderate",
      action: "Examine the animal and record response on the digital twin.",
      animalId,
      caseId,
      audience: "vet",
    });
    await addAlert({
      type: "treatment_advisory",
      title: `Milk Withdrawal Advisory — ${animal?.name || animalId}`,
      body: `Medication (${payload.medicine}) initiated. Withhold milk from consumption/dairies for ${withdrawalMilk} days and meat for ${withdrawalMeat} days after final dose.`,
      location: null,
      riskLevel: "moderate",
      action: "Do not sell or consume milk during the withdrawal period.",
      animalId,
      caseId,
      audience: "farmer",
    });
    return { ok: true as const, message: "Treatment and withdrawal advisory recorded on the digital twin.", href: `/console/animals/${animalId}` };
  }

  if (type === "add_vaccination") {
    const animalId = String(payload.animalId || "");
    const nextDays = Number(payload.nextDueDays || 180);
    const next = new Date(now);
    next.setDate(next.getDate() + nextDays);
    await db.insert(vaccinations).values({
      id: uid("vax"),
      animalId,
      vaccine: String(payload.vaccine || "FMD"),
      dose: String(payload.dose || "2 ml IM"),
      batch: String(payload.batch || "BATCH-DEMO"),
      givenAt: now,
      nextDue: next,
      vetName: actor?.name || String(payload.vetName || "Field team"),
      status: "completed",
    });
    await db.update(animals).set({ lastVaccinationAt: now, updatedAt: now }).where(eq(animals.id, animalId));
    await addEvent({
      animalId,
      type: "vaccination",
      title: `${String(payload.vaccine || "Vaccine")} administered`,
      detail: `Batch ${String(payload.batch || "BATCH-DEMO")} · next due ${next.toLocaleDateString("en-IN")}`,
      actor: actor?.name || "Field team",
    });
    return { ok: true as const, message: "Vaccination recorded.", href: `/console/animals/${animalId}` };
  }

  if (type === "register_animal") {
    // If farmer is registering, enforce registering to their own shed
    const farmId = role === "farmer" && actor?.farmId ? actor.farmId : String(payload.farmId || "");
    const [farm] = await db.select().from(farms).where(eq(farms.id, farmId));
    if (!farm) return { ok: false as const, error: "Choose a valid farm or shed" };
    const count = (await db.select().from(animals)).length + 1;
    const requestedTag = String(payload.earTag || "").trim();
    const id = requestedTag.length >= 6 ? requestedTag : `MH-REG-${String(8000 + count)}`;
    await db.insert(animals).values({
      id,
      name: String(payload.name || "Unnamed"),
      species: String(payload.species || "cattle"),
      breed: String(payload.breed || "Non-descript"),
      sex: String(payload.sex || "female"),
      ageMonths: Number(payload.ageMonths || 24),
      weightKg: Number(payload.weightKg || 280),
      farmId,
      status: "healthy",
      riskLevel: "low",
      suspectedCondition: null,
      confirmedCondition: null,
      affectedRegions: [],
      lastExamAt: null,
      lastVaccinationAt: null,
      milkYieldL: payload.milkYieldL ? Number(payload.milkYieldL) : null,
      pregnant: Boolean(payload.pregnant),
      updatedAt: now,
    });
    await db.update(farms).set({ herdSize: farm.herdSize + 1 }).where(eq(farms.id, farmId));
    await addEvent({
      animalId: id,
      type: "registration",
      title: "Animal registered",
      detail: `${payload.species} · ${payload.breed} · Ear Tag / UID ${id}`,
      actor: actor?.name || "Field worker",
    });
    return { ok: true as const, message: `${payload.name} is on the network as ${id}.`, href: `/console/animals/${id}` };
  }

  if (type === "report_mortality") {
    const animalId = String(payload.animalId || "");
    const [animal] = await db.select().from(animals).where(eq(animals.id, animalId));
    if (!animal) return { ok: false as const, error: "Animal not found" };
    if (role === "farmer" && actor?.farmId && animal.farmId !== actor.farmId) {
      return { ok: false as const, error: "Unauthorized: You can only report mortality for animals in your shed." };
    }
    const [farm] = await db.select().from(farms).where(eq(farms.id, animal.farmId));
    await db.insert(mortalityEvents).values({
      id: uid("mort"),
      animalId,
      cause: String(payload.cause || "Undetermined"),
      notes: String(payload.notes || ""),
      occurredAt: now,
      reportedBy: actor?.name || "Field report",
      villageId: farm?.villageId ?? null,
    });
    await db.update(animals).set({ status: "deceased", riskLevel: "critical", updatedAt: now }).where(eq(animals.id, animalId));
    const open = await db.select().from(cases).where(eq(cases.animalId, animalId));
    for (const c of open.filter((x) => OPEN.includes(x.status))) {
      await db.update(cases).set({ status: "closed", closedAt: now }).where(eq(cases.id, c.id));
    }
    await addEvent({
      animalId,
      type: "mortality",
      title: "Mortality reported · Biosecurity protocol active",
      detail: `Reported cause: ${String(payload.cause || "Under investigation")}. Statutory biosecurity warning issued.`,
      actor: actor?.name || "Field report",
    });
    await addAlert({
      type: "mortality",
      title: `🚨 Mortality & Biosecurity Advisory — ${animal.name}`,
      body: `${animal.name} (${animal.id}) died. Reported cause: ${String(payload.cause || "under investigation")}. Biosecurity alert: Do NOT open or skin carcass if Anthrax or Black Quarter is suspected. Deep burial (2m+) with unslaked lime or complete incineration required.`,
      location: farm?.name || null,
      riskLevel: "critical",
      action: "Enforce carcass biosecurity immediately and investigate in-contact animals.",
      animalId,
      audience: "all",
    });
    return { ok: true as const, message: "Mortality recorded and the herd picture updated.", href: role === "farmer" ? `/console/animals/${animalId}` : "/console/mortality" };
  }

  if (type === "close_case") {
    const caseId = String(payload.caseId || "");
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId));
    if (!c) return { ok: false as const, error: "Case not found" };
    const outcome = String(payload.outcome || "recovering");
    await db.update(cases).set({ status: "closed", closedAt: now, summary: String(payload.note || c.summary) }).where(eq(cases.id, caseId));
    if (outcome === "healthy" || outcome === "recovering") {
      await db.update(animals).set({ status: outcome, riskLevel: outcome === "healthy" ? "low" : "moderate", updatedAt: now }).where(eq(animals.id, c.animalId));
    }
    await addEvent({
      animalId: c.animalId,
      caseId,
      type: "close",
      title: "Case closed",
      detail: String(payload.note || `Outcome: ${outcome}`),
      actor: actor?.name || "Case desk",
    });
    return { ok: true as const, message: "Case closed.", href: `/console/cases/${caseId}` };
  }

  if (type === "escalate") {
    const caseId = String(payload.caseId || "");
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId));
    if (!c) return { ok: false as const, error: "Case not found" };
    await db.update(cases).set({ riskLevel: "critical" }).where(eq(cases.id, caseId));
    await db.update(animals).set({ riskLevel: "critical", updatedAt: now }).where(eq(animals.id, c.animalId));
    await addAlert({
      type: "escalation",
      title: `Escalated — ${c.caseCode}`,
      body: String(payload.note || "Field team requested district attention."),
      location: null,
      riskLevel: "critical",
      action: "Review on the command map and confirm movement control.",
      animalId: c.animalId,
      caseId,
      audience: "government",
    });
    await addEvent({
      animalId: c.animalId,
      caseId,
      type: "escalation",
      title: "Case escalated to district",
      detail: String(payload.note || "Escalated"),
      actor: actor?.name || "Field team",
    });
    return { ok: true as const, message: "Escalated to the command center." };
  }

  if (type === "schedule_followup") {
    const treatmentId = String(payload.treatmentId || "");
    const [tx] = await db.select().from(treatments).where(eq(treatments.id, treatmentId));
    if (!tx) return { ok: false as const, error: "Treatment not found" };
    const when = payload.followUp ? new Date(String(payload.followUp)) : new Date(Date.now() + 86400000 * 2);
    await db.update(treatments).set({ followUp: when, response: String(payload.response || tx.response) }).where(eq(treatments.id, treatmentId));
    await addEvent({
      animalId: tx.animalId,
      caseId: tx.caseId,
      type: "followup",
      title: "Follow-up scheduled",
      detail: when.toLocaleDateString("en-IN"),
      actor: actor?.name || tx.vetName,
    });
    return { ok: true as const, message: "Follow-up is on the calendar." };
  }

  if (type === "forward_case") {
    const caseId = String(payload.caseId || "");
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId));
    if (!c) return { ok: false as const, error: "Case not found" };
    const vetName = String(payload.vetName || "Dr. Ananya Kulkarni");
    const note = String(payload.note || "");
    await db
      .update(cases)
      .set({ status: ["reported", "triaged"].includes(c.status) ? "assigned" : c.status, assignedVetId: String(payload.vetId || "u-ananya"), assignedVetName: vetName })
      .where(eq(cases.id, caseId));
    if (note) {
      await addEvent({ animalId: c.animalId, caseId, type: "observation", title: "Field observation", detail: note, actor: actor?.name || "Field worker" });
    }
    await addEvent({ animalId: c.animalId, caseId, type: "referral", title: `Forwarded to ${vetName}`, detail: note || "Case referred for veterinary examination.", actor: actor?.name || "Field worker" });
    await addAlert({
      type: "referral",
      title: `New referral — ${c.caseCode}`,
      body: `${actor?.name || "Field worker"} forwarded this case. ${note}`.trim(),
      location: null,
      riskLevel: c.riskLevel as RiskLevel,
      action: "Open the case, review the Digital Twin and schedule an examination.",
      animalId: c.animalId,
      caseId,
      audience: "vet",
    });
    return { ok: true as const, message: `Forwarded to ${vetName}.` };
  }

  if (type === "update_case_status") {
    const caseId = String(payload.caseId || "");
    const status = String(payload.status || "");
    const allowed = ["reported", "triaged", "assigned", "examined", "sampled", "tested", "confirmed", "rejected", "treated", "closed"];
    if (!allowed.includes(status)) return { ok: false as const, error: "Invalid status" };
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId));
    if (!c) return { ok: false as const, error: "Case not found" };
    await db.update(cases).set({ status, closedAt: status === "closed" ? now : null }).where(eq(cases.id, caseId));
    if (status === "treated") await db.update(animals).set({ status: "recovering", updatedAt: now }).where(eq(animals.id, c.animalId));
    await addEvent({ animalId: c.animalId, caseId, type: "status", title: `Case status → ${status}`, detail: String(payload.note || ""), actor: actor?.name || "Veterinarian" });
    await addAlert({
      type: "case_update",
      title: `${c.caseCode} is now ${status}`,
      body: String(payload.note || "Case status updated by the veterinarian."),
      location: null,
      riskLevel: c.riskLevel as RiskLevel,
      action: "Open the Digital Twin to see the latest record.",
      animalId: c.animalId,
      caseId,
      audience: "farmer",
    });
    return { ok: true as const, message: `Case moved to ${status}.` };
  }

  if (type === "record_monitoring") {
    const animalId = String(payload.animalId || "");
    const note = String(payload.note || "");
    const outcome = String(payload.outcome || "recovering");
    await db.update(animals).set({ status: outcome, riskLevel: outcome === "healthy" ? "low" : "moderate", updatedAt: now }).where(eq(animals.id, animalId));
    await addEvent({ animalId, type: "recovery", title: outcome === "healthy" ? "Recovered — back to healthy" : "Recovery monitoring", detail: note, actor: actor?.name || "Veterinarian" });
    return { ok: true as const, message: "Recovery note added to the Digital Twin." };
  }

  if (type === "issue_advisory") {
    const title = String(payload.title || "").trim();
    const body = String(payload.body || "").trim();
    if (!title || !body) return { ok: false as const, error: "Title and message are required" };
    const audience = String(payload.audience || "all");
    const aud = audience === "everyone" ? ["farmer", "field", "vet", "lab"] : [audience];
    for (const a of aud) {
      await addAlert({
        type: "advisory",
        title,
        body: [body, payload.bodyHi, payload.bodyMr].filter(Boolean).join("\n\n"),
        location: String(payload.location || "District-wide"),
        riskLevel: (String(payload.riskLevel || "high") as RiskLevel),
        action: String(payload.action || "Follow the advisory and report any sick animal immediately."),
        audience: a,
      });
    }
    return { ok: true as const, message: `Advisory sent to ${audience === "everyone" ? "all field roles" : audience}.` };
  }

  if (type === "cluster_action") {
    const clusterId = String(payload.clusterId || "");
    const step = String(payload.step || "");
    const [cl] = await db.select().from(clusters).where(eq(clusters.id, clusterId));
    if (!cl) return { ok: false as const, error: "Cluster not found" };
    const labels: Record<string, string> = {
      movement_hold: "Animal movement hold declared (5 km)",
      ring_vaccination: "Ring vaccination ordered",
      surveillance: "Active door-to-door surveillance ordered",
      contained: "Cluster declared contained",
    };
    if (!labels[step]) return { ok: false as const, error: "Unknown response step" };
    if (step === "contained") await db.update(clusters).set({ status: "contained", riskLevel: "moderate" }).where(eq(clusters.id, clusterId));
    for (const animalId of cl.animalIds) {
      await addEvent({ animalId, type: "containment", title: labels[step], detail: `${cl.title} · district response`, actor: actor?.name || "District command" });
    }
    await addAlert({
      type: "containment",
      title: labels[step],
      body: `${cl.title}. ${cl.summary}`,
      location: cl.title,
      riskLevel: step === "contained" ? "moderate" : "critical",
      action: step === "ring_vaccination" ? "Vaccinate all susceptible animals inside the ring within 72 hours." : step === "movement_hold" ? "No animal movement, markets or fairs inside the zone." : step === "surveillance" ? "Visit every shed in the zone and report new cases today." : "Maintain recovery monitoring for 21 days.",
      audience: "all",
    });
    return { ok: true as const, message: labels[step] + "." };
  }

  if (type === "mark_alert_read") {
    const alertId = String(payload.alertId || "");
    const userId = String(payload.userId || actor?.id || "");
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, alertId));
    if (!alert) return { ok: false as const, error: "Alert not found" };
    const readBy = alert.readBy.includes(userId) ? alert.readBy : [...alert.readBy, userId];
    await db.update(alerts).set({ readBy }).where(eq(alerts.id, alertId));
    return { ok: true as const, message: "Alert acknowledged." };
  }

  return { ok: false as const, error: "Unknown action" };
}
