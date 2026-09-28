import { getSnapshot, visibleAlerts, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const snapshot = await getSnapshot();
  const animals = visibleAnimals(user, snapshot.animals);
  return Response.json({
    generatedAt: snapshot.generatedAt,
    user,
    animals,
    farms: snapshot.farms,
    villages: snapshot.villages,
    blocks: snapshot.blocks,
    districts: snapshot.districts,
    alerts: visibleAlerts(user, snapshot).slice(0, 12),
    vaccinations: snapshot.vaccinations.filter((v) => animals.some((a) => a.id === v.animalId)),
  });
}
