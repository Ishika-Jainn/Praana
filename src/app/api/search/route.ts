import { getSnapshot, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ results: [] });
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";
  if (q.length < 1) return Response.json({ results: [] });
  const snap = await getSnapshot();
  const pool = user.role === "government" || user.role === "lab" ? snap.animals : visibleAnimals(user, snap.animals);
  const results = pool
    .filter((a) =>
      [a.name, a.id, a.breed, a.villageName, a.farmName, a.ownerName, a.suspectedCondition]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      name: a.name,
      meta: `${a.breed} · ${a.villageName} · ${a.status}`,
      href: `/console/animals/${a.id}`,
    }));
  return Response.json({ results });
}
