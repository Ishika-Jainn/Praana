import { getSessionUser } from "@/lib/session";
import { createHealthReport } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.animalId) return Response.json({ error: "Choose an animal." }, { status: 400 });
  const result = await createHealthReport({
    animalId: String(body.animalId),
    reporterId: user.id,
    reporterName: user.name,
    symptoms: Array.isArray(body.symptoms) ? body.symptoms.map(String) : [],
    regions: Array.isArray(body.regions) ? body.regions.map(String) : [],
    severity: String(body.severity || "moderate"),
    duration: body.duration ? String(body.duration) : null,
    notes: body.notes ? String(body.notes) : null,
    voiceTranscript: body.voiceTranscript ? String(body.voiceTranscript) : null,
    language: body.language ? String(body.language) : user.language,
    photos: Array.isArray(body.photos) ? body.photos : [],
    documents: Array.isArray(body.documents) ? body.documents : [],
    lat: body.lat != null ? Number(body.lat) : null,
    lng: body.lng != null ? Number(body.lng) : null,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result);
}
