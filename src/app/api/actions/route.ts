import { getSessionUser } from "@/lib/session";
import { createHealthReport, performAction } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.type) return Response.json({ error: "Missing action." }, { status: 400 });

  if (body.type === "sync_batch") {
    const items = Array.isArray(body.items) ? body.items : [];
    const results = [];
    for (const item of items) {
      if (item.kind === "report") {
        results.push(
          await createHealthReport({
            ...item.payload,
            reporterId: user.id,
            reporterName: user.name,
          }),
        );
      } else {
        results.push(await performAction(String(item.kind), item.payload || {}, user));
      }
    }
    return Response.json({ ok: true, results });
  }

  const result = await performAction(String(body.type), body.payload || {}, user);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result);
}
