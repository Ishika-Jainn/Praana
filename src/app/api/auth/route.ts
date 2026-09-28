import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { farms, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { createToken, hashPassword, ROLE_HOME, verifyPassword } from "@/lib/auth";
import { getUser, mapUser } from "@/lib/data";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function startSession(request: Request, userId: string) {
  const token = createToken(userId);
  const jar = await cookies();
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  const secure = proto === "https";
  jar.set("praana_session", token, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    partitioned: secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return token;
}

export async function GET() {
  const user = await getSessionUser();
  return Response.json({ user });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const body = await request.json().catch(() => ({}));
  const mode = String(body.mode || "signin");

  if (mode === "signup") {
    const name = String(body.name || "").trim();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "farmer");
    if (!name || !identifier || password.length < 6) {
      return Response.json({ error: "Name, phone or email, and a password of at least 6 characters are required." }, { status: 400 });
    }
    if (!["farmer", "field", "vet", "lab", "government"].includes(role)) return Response.json({ error: "Choose a role." }, { status: 400 });
    const email = identifier.includes("@") ? identifier : null;
    const phone = email ? null : identifier.replace(/\s/g, "");
    const clash = await db.select().from(users).where(email ? eq(users.email, email) : eq(users.phone, phone!));
    if (clash.length) return Response.json({ error: "An account already uses that phone or email." }, { status: 409 });

    let farmId = body.farmId ? String(body.farmId) : null;
    if (role === "farmer" && !farmId) {
      const fSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 14);
      farmId = `f-${fSlug}-${Date.now().toString(36).slice(-4)}`;
      const farmName = String(body.farmName || "").trim() || `${name}'s Dairy Farm`;
      await db.insert(farms).values({
        id: farmId,
        villageId: String(body.villageId || "v-kalevadi"),
        name: farmName,
        ownerName: name,
        ownerPhone: phone || null,
        lat: 17.288 + (Math.random() - 0.5) * 0.03,
        lng: 74.184 + (Math.random() - 0.5) * 0.03,
        herdSize: 0,
      });
    }

    const scope: Record<string, { farmId?: string; villageId?: string; blockId?: string; districtId?: string; title: string }> = {
      farmer: { farmId: farmId || "f-patil", villageId: "v-kalevadi", blockId: "b-karad", districtId: "d-satara", title: "Livestock owner" },
      field: { villageId: "v-kalevadi", blockId: "b-karad", districtId: "d-satara", title: "Field worker, Karad" },
      vet: { blockId: "b-karad", districtId: "d-satara", title: "Veterinary Officer" },
      lab: { districtId: "d-satara", title: "Laboratory analyst" },
      government: { title: "District surveillance officer" },
    };
    const s = scope[role];
    const id = `u-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 16)}-${Date.now().toString(36).slice(-4)}`;
    await db.insert(users).values({
      id,
      name,
      role,
      phone,
      email,
      title: s.title,
      language: String(body.language || "en"),
      farmId: s.farmId ?? null,
      villageId: s.villageId ?? null,
      blockId: s.blockId ?? null,
      districtId: s.districtId ?? null,
      passwordHash: hashPassword(password),
    });
    const user = await getUser(id);
    const token = await startSession(request, id);
    return Response.json({ ok: true, user, token, dest: ROLE_HOME[role] });
  }

  if (mode === "demo") {
    const user = await getUser(String(body.userId || ""));
    if (!user) return Response.json({ error: "Unknown desk." }, { status: 404 });
    const token = await startSession(request, user.id);
    return Response.json({ ok: true, user, token, dest: ROLE_HOME[user.role] });
  }

  const identifier = String(body.identifier || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!identifier || !password) return Response.json({ error: "Enter your phone or email and password." }, { status: 400 });
  const phone = identifier.replace(/\s/g, "");
  const rows = await db.select().from(users).where(or(eq(users.email, identifier), eq(users.phone, phone), eq(users.phone, identifier)));
  const all = rows.length ? rows : (await db.select().from(users)).filter((u) => (u.phone || "").replace(/\s/g, "") === phone);
  const row = all[0];
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return Response.json({ error: "Phone/email or password is incorrect." }, { status: 401 });
  }
  if (body.role && body.role !== row.role) {
    return Response.json({ error: `This account is registered as ${row.role}. Pick that role to continue.` }, { status: 403 });
  }
  const token = await startSession(request, row.id);
  return Response.json({ ok: true, user: mapUser(row), token, dest: ROLE_HOME[row.role] });
}

export async function DELETE(request: Request) {
  const jar = await cookies();
  const secure = (request.headers.get("x-forwarded-proto") || "") === "https";
  jar.set("praana_session", "", { path: "/", maxAge: 0, sameSite: secure ? "none" : "lax", secure, partitioned: secure });
  jar.delete("praana_user");
  return Response.json({ ok: true });
}
