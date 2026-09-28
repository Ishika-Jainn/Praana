import { seedDatabase } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await seedDatabase(force);
  return Response.json(result);
}
