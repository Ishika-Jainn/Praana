import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SECRET = process.env.AUTH_SECRET || process.env.DATABASE_URL || "praana-demo-secret";
export const DEMO_PASSWORD = "praana123";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return password === DEMO_PASSWORD;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 32);
  const real = Buffer.from(hash, "hex");
  return real.length === test.length && timingSafeEqual(real, test);
}

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url").slice(0, 32);
}

/** Session token: userId.expiry.signature — used as cookie value or ?as= fallback. */
export function createToken(userId: string, days = 14) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const body = `${userId}.${exp}`;
  return `${body}.${sign(body)}`;
}

export function readToken(token: string | null | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return userId;
}

export const ROLE_HOME: Record<string, string> = {
  farmer: "/console/farmer",
  field: "/console/field",
  vet: "/console/vet",
  lab: "/console/lab",
  government: "/console/command",
};
