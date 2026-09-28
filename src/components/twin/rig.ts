import * as THREE from "three";
import { add, gauss, loft, mix3, norm, pointOnCurve, ribArc, tube, type V3 } from "./geometry";
import type { MatKey } from "./materials";

export type Part = { geo: THREE.BufferGeometry; mat: MatKey; pos?: V3; rot?: V3; scl?: V3; xray?: boolean };
export type Pivoted = { pivot: V3; parts: Part[]; side?: number };
export type Rig = {
  kind: "quad" | "bird";
  body: Part[];
  limbs: Part[];
  head: Pivoted;
  ears: Pivoted[];
  tail: Pivoted | null;
  anchors: Record<string, V3[]>;
  radii: Record<string, number>;
  breathe: V3;
  height: number;
  center: V3;
  breathRate: number;
};

const SPH = new THREE.SphereGeometry(1, 40, 28);
const CYL = new THREE.CylinderGeometry(0.72, 1, 1, 24);
const TOR = new THREE.TorusGeometry(1, 0.2, 10, 36);
const KNOT = new THREE.TorusKnotGeometry(1, 0.26, 120, 14, 2, 5);
const D = Math.PI / 180;

type Horns = "zebu" | "lyre" | "buffalo" | "murrah" | "goat" | "ram" | "none";
type QuadSpec = {
  L: number;
  Y: number;
  W: number;
  H: number;
  B: number;
  power: number;
  hump: number;
  humpT: number;
  humpW: number;
  withers: number;
  neck: { len: number; angle: number; r0: number; r1: number; dewlap: number; sag: number };
  head: { len: number; angle: number; w: number; h: number; muzzle: number; snout: "bovine" | "caprine" | "porcine" | "camelid" };
  legs: { thick: number; foot: "cloven" | "trotter" | "pad" };
  tail: { len: number; r: number; tuft: number; style: "hang" | "up" | "curl" | "short" };
  ears: { len: number; w: number; droop: number; forward: number; lift: number };
  horns: Horns;
  beard: boolean;
  wool: boolean;
  udder: "cow" | "goat" | "sow" | "none";
  organs: "ruminant" | "mono";
  breath: number;
};

const BASE: Record<string, QuadSpec> = {
  cattle: {
    L: 1.95, Y: 1.22, W: 0.4, H: 0.36, B: 0.46, power: 2.35, hump: 0.19, humpT: 0.86, humpW: 0.06, withers: 0.04,
    neck: { len: 0.5, angle: 22 * D, r0: 0.3, r1: 0.19, dewlap: 0.15, sag: 0 },
    head: { len: 0.6, angle: -56 * D, w: 0.155, h: 0.16, muzzle: 0.11, snout: "bovine" },
    legs: { thick: 1, foot: "cloven" },
    tail: { len: 0.95, r: 0.04, tuft: 0.15, style: "hang" },
    ears: { len: 0.2, w: 0.075, droop: 0.35, forward: 0.1, lift: 0.3 },
    horns: "zebu", beard: false, wool: false, udder: "cow", organs: "ruminant", breath: 1.4,
  },
  buffalo: {
    L: 2.05, Y: 1.12, W: 0.46, H: 0.38, B: 0.5, power: 2.5, hump: 0, humpT: 0.86, humpW: 0.06, withers: 0.03,
    neck: { len: 0.46, angle: 10 * D, r0: 0.32, r1: 0.22, dewlap: 0.03, sag: 0 },
    head: { len: 0.66, angle: -38 * D, w: 0.17, h: 0.16, muzzle: 0.13, snout: "bovine" },
    legs: { thick: 1.08, foot: "cloven" },
    tail: { len: 0.85, r: 0.042, tuft: 0.12, style: "hang" },
    ears: { len: 0.21, w: 0.08, droop: 0.15, forward: 0, lift: 0.3 },
    horns: "murrah", beard: false, wool: false, udder: "cow", organs: "ruminant", breath: 1.3,
  },
  goat: {
    L: 1.6, Y: 1.25, W: 0.28, H: 0.28, B: 0.34, power: 2.1, hump: 0, humpT: 0.86, humpW: 0.06, withers: 0.035,
    neck: { len: 0.6, angle: 50 * D, r0: 0.17, r1: 0.105, dewlap: 0, sag: 0 },
    head: { len: 0.5, angle: -48 * D, w: 0.11, h: 0.13, muzzle: 0.07, snout: "caprine" },
    legs: { thick: 0.58, foot: "cloven" },
    tail: { len: 0.2, r: 0.03, tuft: 0.06, style: "up" },
    ears: { len: 0.34, w: 0.08, droop: 1.25, forward: 0.25, lift: 0.3 },
    horns: "goat", beard: true, wool: false, udder: "goat", organs: "ruminant", breath: 2,
  },
  sheep: {
    L: 1.7, Y: 1.18, W: 0.4, H: 0.38, B: 0.4, power: 2.2, hump: 0, humpT: 0.86, humpW: 0.06, withers: 0.02,
    neck: { len: 0.42, angle: 34 * D, r0: 0.24, r1: 0.13, dewlap: 0, sag: 0 },
    head: { len: 0.46, angle: -55 * D, w: 0.11, h: 0.125, muzzle: 0.075, snout: "caprine" },
    legs: { thick: 0.52, foot: "cloven" },
    tail: { len: 0.32, r: 0.06, tuft: 0, style: "short" },
    ears: { len: 0.2, w: 0.06, droop: 0.05, forward: 0.05, lift: 0.3 },
    horns: "none", beard: false, wool: true, udder: "goat", organs: "ruminant", breath: 2,
  },
  pig: {
    L: 1.95, Y: 0.88, W: 0.45, H: 0.42, B: 0.44, power: 2.2, hump: 0, humpT: 0.86, humpW: 0.06, withers: 0,
    neck: { len: 0.22, angle: 8 * D, r0: 0.4, r1: 0.33, dewlap: 0, sag: 0 },
    head: { len: 0.58, angle: -16 * D, w: 0.24, h: 0.23, muzzle: 0.11, snout: "porcine" },
    legs: { thick: 0.78, foot: "trotter" },
    tail: { len: 0.22, r: 0.022, tuft: 0, style: "curl" },
    ears: { len: 0.27, w: 0.12, droop: 0.9, forward: 0.95, lift: 0.55 },
    horns: "none", beard: false, wool: false, udder: "sow", organs: "mono", breath: 1.8,
  },
  camel: {
    L: 1.8, Y: 1.72, W: 0.34, H: 0.3, B: 0.36, power: 2.1, hump: 0.5, humpT: 0.5, humpW: 0.14, withers: 0,
    neck: { len: 1.05, angle: 40 * D, r0: 0.2, r1: 0.12, dewlap: 0, sag: 0.28 },
    head: { len: 0.55, angle: -6 * D, w: 0.12, h: 0.13, muzzle: 0.085, snout: "camelid" },
    legs: { thick: 0.72, foot: "pad" },
    tail: { len: 0.6, r: 0.03, tuft: 0.1, style: "hang" },
    ears: { len: 0.09, w: 0.04, droop: -0.3, forward: -0.1, lift: 0.4 },
    horns: "none", beard: false, wool: false, udder: "goat", organs: "mono", breath: 1.1,
  },
};

function quadSpec(species: string, breed: string, sex: string): QuadSpec {
  const s: QuadSpec = structuredClone(BASE[species] ?? BASE.cattle);
  if (species === "cattle") {
    const zebu = !["HF cross", "Jersey cross"].includes(breed);
    s.hump = zebu ? (sex === "male" ? 0.3 : 0.19) : 0;
    s.neck.dewlap = zebu ? 0.16 : 0.05;
    if (breed === "Gir") {
      s.ears = { len: 0.32, w: 0.085, droop: 1.35, forward: 0.35, lift: 0.22 };
      s.head.h *= 1.06;
    }
    if (breed === "Khillar") s.horns = "lyre";
    if (breed === "HF cross") {
      s.horns = "none";
      s.W *= 1.05;
      s.B *= 1.06;
    }
    if (breed === "Jersey cross") {
      s.L *= 0.95;
      s.Y *= 0.95;
    }
  }
  if (species === "buffalo") s.horns = breed === "Pandharpuri" ? "buffalo" : "murrah";
  if (species === "goat" && !["Osmanabadi", "Black Bengal"].includes(breed)) s.ears = { ...s.ears, droop: 0.45, len: 0.22 };
  if (species === "sheep") s.horns = sex === "male" ? "ram" : "none";
  if (sex === "male") {
    s.udder = "none";
    s.neck.r0 *= 1.1;
    s.neck.r1 *= 1.06;
  }
  return s;
}

function jointKeys(pts: V3[], radii: number[]) {
  const d = [0];
  for (let i = 1; i < pts.length; i++) {
    d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  }
  const tot = d[d.length - 1] || 1;
  return pts.map((_, i) => [d[i] / tot, radii[i] * 0.86, radii[i] * 1.08, radii[i] * 1.08]);
}

const scaleKeys = (keys: number[][], k: number) => keys.map(([t, ...r]) => [t, ...r.map((v) => v * k)]);

function buildQuad(species: string, breed: string, sex: string): Rig {
  const s = quadSpec(species, breed, sex);
  const { L, Y, W, H, B } = s;
  const K = Math.min(1.15, Math.max(0.72, W / 0.4));
  const rumpX = L / 2;
  const chestX = -L / 2;
  const body: Part[] = [];
  const limbs: Part[] = [];
  const headParts: Part[] = [];
  const ears: Pivoted[] = [];
  const anchors: Record<string, V3[]> = { legs: [], hooves: [], eyes: [] };

  // ---------- torso ----------
  const woolBody = s.wool
    ? (t: number, a: number) => 0.075 + 0.024 * Math.sin(t * 70 + Math.sin(a * 7) * 2.5) * Math.cos(a * 12 + t * 31) + 0.012 * Math.sin(a * 23 + t * 97)
    : undefined;
  const bodyPts: V3[] = [
    [rumpX + 0.02, Y + 0.03, 0],
    [L * 0.22, Y - 0.01, 0],
    [-L * 0.18, Y - 0.02, 0],
    [chestX - 0.02, Y + 0.04, 0],
  ];
  const bodyKeys = [
    [0, W * 0.74, H * 0.86, B * 0.78],
    [0.13, W * 0.97, H * 1.0, B * 0.9],
    [0.3, W * 0.94, H * 0.95, B * 1.0],
    [0.52, W * 1.0, H * 0.93, B * 1.08],
    [0.74, W * 0.97, H * 0.98, B * 1.02],
    [0.9, W * 0.88, H * 1.0, B * 0.96],
    [1, W * 0.76, H * 0.95, B * 0.86],
  ];
  body.push({
    geo: loft({
      points: bodyPts,
      keys: bodyKeys,
      segments: 84,
      radial: 60,
      round: [0.11, 0.1],
      power: s.power,
      topAdd: (t) => s.hump * gauss(t, s.humpT, s.humpW) + s.withers * gauss(t, 0.84, 0.07),
      displace: woolBody,
    }),
    mat: "coat",
  });

  // ---------- neck ----------
  const na = s.neck.angle;
  const ndir: V3 = [-Math.cos(na), Math.sin(na), 0];
  const nBase: V3 = [chestX + 0.2, Y + H * 0.3, 0];
  const nEnd = add(nBase, ndir, s.neck.len);
  const nMid = add(add(nBase, ndir, s.neck.len * 0.5), [0, -s.neck.sag, 0]);
  const neckPts: V3[] = [add(nBase, ndir, -0.18), nBase, nMid, nEnd];
  const { r0, r1 } = s.neck;
  const neckKeys = [
    [0, r0 * 1.05, r0 * 1.1, r0 * 1.15],
    [0.3, r0, r0, r0 * 1.05],
    [0.75, ((r0 + r1) / 2) * 0.95, (r0 + r1) / 2, (r0 + r1) / 2],
    [1, r1, r1 * 1.05, r1],
  ];
  headParts.push({
    geo: loft({
      points: neckPts,
      keys: neckKeys,
      segments: 52,
      radial: 44,
      power: 2.1,
      round: [0, 0.05],
      bottomAdd: (t) => s.neck.dewlap * gauss(t, 0.4, 0.2),
      displace: s.wool ? (t, a) => (0.055 + 0.02 * Math.sin(t * 40 + Math.sin(a * 6) * 2) * Math.cos(a * 10)) * (1 - t * 0.7) : undefined,
    }),
    mat: "coat",
  });

  // ---------- head ----------
  const hs = s.head;
  const hdir: V3 = [-Math.cos(hs.angle), Math.sin(hs.angle), 0];
  const hUp: V3 = norm([hdir[1], -hdir[0], 0]);
  const theta = Math.atan2(hdir[1], hdir[0]);
  const hStart = add(add(nEnd, hUp, r1 * 0.35), hdir, -0.04);
  const hEnd = add(hStart, hdir, hs.len);
  const hMid = add(add(hStart, hdir, hs.len * 0.5), hUp, hs.h * 0.06);
  const { w, h, muzzle: m } = hs;
  const headKeys: Record<string, number[][]> = {
    bovine: [[0, w * 0.9, h * 0.9, h * 0.85], [0.25, w, h, h * 0.95], [0.5, w * 0.82, h * 0.8, h * 0.85], [0.78, m * 1.05, m, m * 1.05], [1, m * 1.1, m * 0.95, m]],
    caprine: [[0, w * 0.9, h * 0.9, h * 0.85], [0.28, w, h, h * 0.9], [0.6, w * 0.7, h * 0.7, h * 0.72], [0.85, m, m, m * 1.1], [1, m * 0.9, m * 0.85, m * 0.95]],
    porcine: [[0, w * 0.95, h * 0.95, h * 0.95], [0.25, w, h, h], [0.55, w * 0.72, h * 0.72, h * 0.74], [0.85, m * 1.1, m * 1.05, m * 1.05], [1, m * 1.15, m * 1.1, m * 1.1]],
    camelid: [[0, w * 0.9, h * 0.85, h * 0.85], [0.3, w, h, h * 0.9], [0.62, w * 0.72, h * 0.72, h * 0.82], [0.88, m, m, m * 1.15], [1, m * 0.95, m * 0.9, m * 1.05]],
  };
  const hk = headKeys[hs.snout];
  const headPts: V3[] = [hStart, hMid, hEnd];
  headParts.push({
    geo: loft({ points: headPts, keys: hk, segments: 52, radial: 44, round: hs.snout === "porcine" ? [0.22, 0.03] : [0.24, 0.16], power: 2.2, refUp: hUp }),
    mat: "face",
  });

  // muzzle / snout
  if (hs.snout === "porcine") {
    headParts.push({ geo: CYL, mat: "muzzle", pos: add(hEnd, hdir, 0.004), rot: [0, 0, theta - Math.PI / 2], scl: [m * 1.12, 0.05, m * 1.02] });
    for (const sd of [-1, 1]) headParts.push({ geo: SPH, mat: "nostril", pos: add(add(hEnd, hdir, 0.03), [0, 0, sd * m * 0.42]), scl: [0.012, 0.028, 0.022] });
  } else {
    const mScale: V3 = hs.snout === "bovine" ? [m * 0.75, m * 1.0, m * 1.18] : hs.snout === "camelid" ? [m * 0.8, m * 1.05, m * 1.08] : [m * 0.6, m * 0.8, m * 0.95];
    headParts.push({ geo: SPH, mat: hs.snout === "camelid" ? "face" : "muzzle", pos: add(hEnd, hdir, -0.035), rot: [0, 0, theta], scl: mScale });
    for (const sd of [-1, 1]) {
      headParts.push({ geo: SPH, mat: "nostril", pos: add(add(add(hEnd, hdir, 0.012), hUp, m * 0.22), [0, 0, sd * m * 0.45]), rot: [0, 0, theta], scl: [0.012, 0.018, 0.026] });
    }
  }

  // eyes with lids
  const eyeC = add(add(hStart, hdir, hs.len * 0.3), hUp, h * 0.42);
  const er = w * (hs.snout === "caprine" ? 0.22 : 0.2);
  for (const sd of [1, -1]) {
    const p = add(eyeC, [0, 0, sd * w * 0.86]);
    headParts.push({ geo: SPH, mat: "eye", pos: p, scl: [er, er, er] });
    headParts.push({ geo: TOR, mat: "face", pos: p, rot: [0, 0, theta], scl: [er * 1.12, er * 0.95, er * 1.4] });
    anchors.eyes.push(add(p, [0, 0, sd * er]));
  }

  // ears
  const earBase0 = add(add(hStart, hdir, hs.len * 0.06), hUp, h * s.ears.lift);
  for (const sd of [1, -1]) {
    const base = add(earBase0, [0, 0, sd * w * 0.9]);
    const eDir = norm(add(add([0, 0, sd], [0, -1, 0], s.ears.droop), hdir, s.ears.forward));
    const tip = add(base, eDir, s.ears.len);
    const mid = add(add(base, eDir, s.ears.len * 0.5), [0, -Math.abs(s.ears.droop) * s.ears.len * 0.08, 0]);
    const ew = s.ears.w;
    const outer = loft({ points: [base, mid, tip], keys: [[0, ew * 0.45, 0.018, 0.018], [0.35, ew, 0.022, 0.02], [0.75, ew * 0.8, 0.016, 0.016], [1, ew * 0.25, 0.01, 0.01]], segments: 22, radial: 18, round: [0, 0.28], refUp: hdir });
    const inner = loft({
      points: [add(base, hdir, 0.012), add(mid, hdir, 0.013), add(tip, hdir, 0.01)],
      keys: [[0, ew * 0.3, 0.01, 0.01], [0.35, ew * 0.75, 0.012, 0.012], [0.75, ew * 0.6, 0.01, 0.01], [1, ew * 0.15, 0.006, 0.006]],
      segments: 22,
      radial: 14,
      round: [0, 0.3],
      refUp: hdir,
    });
    ears.push({ pivot: base, side: sd, parts: [{ geo: outer, mat: "face" }, { geo: inner, mat: "skin" }] });
  }

  // horns
  if (s.horns !== "none") {
    const hornBase = add(add(hStart, hdir, hs.len * 0.04), hUp, h * 0.78);
    for (const sd of [1, -1]) {
      const b = add(hornBase, [0, 0, sd * w * 0.55]);
      const out: V3 = [0, 0, sd];
      const back: V3 = [-hdir[0], -hdir[1], 0];
      const P = (o: number, u: number, bk: number) => mix3([b, 1], [out, o], [hUp, u], [back, bk]);
      const shapes: Record<Exclude<Horns, "none">, { pts: V3[]; r: [number, number] }> = {
        zebu: { pts: [b, P(0.06, 0.07, 0.02), P(0.1, 0.15, 0.08), P(0.1, 0.21, 0.16)], r: [0.042, 0.01] },
        lyre: { pts: [b, P(0.08, 0.1, 0), P(0.15, 0.24, 0.06), P(0.14, 0.38, 0.16), P(0.1, 0.46, 0.25)], r: [0.045, 0.01] },
        buffalo: { pts: [b, P(0.12, 0.02, 0.08), P(0.28, 0.05, 0.3), P(0.34, 0.12, 0.62), P(0.3, 0.22, 0.9)], r: [0.07, 0.014] },
        murrah: { pts: [b, P(0.1, 0.03, 0.1), P(0.17, -0.05, 0.18), P(0.17, -0.17, 0.1), P(0.12, -0.2, -0.02), P(0.07, -0.12, -0.06)], r: [0.072, 0.022] },
        goat: { pts: [b, P(0.02, 0.1, 0.04), P(0.05, 0.19, 0.14), P(0.08, 0.22, 0.26), P(0.1, 0.2, 0.34)], r: [0.032, 0.007] },
        ram: { pts: [b, P(0.03, 0.08, 0.06), P(0.1, 0.1, 0.16), P(0.18, -0.01, 0.2), P(0.2, -0.13, 0.12), P(0.16, -0.17, 0), P(0.12, -0.08, -0.04)], r: [0.065, 0.018] },
      };
      const shape = shapes[s.horns];
      headParts.push({ geo: tube(shape.pts, shape.r[0], shape.r[1], { segments: 44, radial: 18 }), mat: "horn" });
    }
  }

  if (s.beard) {
    const chin = add(add(hEnd, hdir, -hs.len * 0.2), hUp, -m * 1.0);
    headParts.push({ geo: tube([chin, add(chin, [0.01, -0.08, 0]), add(chin, [0.03, -0.17, 0])], 0.03, 0.006, { segments: 16, radial: 10 }), mat: "tuft" });
  }

  // x-ray: neck vertebrae + skull
  for (let i = 0; i < 9; i++) {
    const p = pointOnCurve(neckPts, 0.15 + (i / 8) * 0.85);
    headParts.push({ geo: SPH, mat: "bone", pos: p, scl: [0.035 * K, 0.03 * K, 0.035 * K], xray: true });
  }
  headParts.push({ geo: loft({ points: headPts, keys: scaleKeys(hk, 0.72), segments: 30, radial: 24, round: [0.24, 0.16], refUp: hUp }), mat: "bone", xray: true });

  // ---------- legs ----------
  const t = s.legs.thick;
  const fx = chestX + L * 0.19;
  const bx = rumpX - L * 0.17;
  const zs = W * 0.55;
  const legBones: Part[] = [];
  const legSets: { pts: V3[]; radii: number[] }[] = [];
  for (const sd of [1, -1]) {
    const z = sd * zs;
    legSets.push({
      pts: [[fx + 0.03, Y + 0.08, z * 0.75], [fx + 0.05, Y - B * 0.85, z], [fx + 0.01, Y * 0.37, z], [fx, Y * 0.2, z], [fx - 0.01, Y * 0.1, z], [fx - 0.03, 0.06, z]],
      radii: [0.2, 0.12, 0.078, 0.052, 0.062, 0.05].map((r) => r * t),
    });
    legSets.push({
      pts: [[bx - 0.02, Y + H * 0.25, z * 0.7], [bx - 0.13, Y - B * 0.7, z], [bx + 0.1, Y * 0.43, z], [bx + 0.07, Y * 0.22, z], [bx + 0.05, Y * 0.1, z], [bx + 0.03, 0.06, z]],
      radii: [0.24, 0.16, 0.078, 0.052, 0.062, 0.05].map((r) => r * t),
    });
  }
  legSets.forEach(({ pts, radii }, i) => {
    limbs.push({ geo: loft({ points: pts, keys: jointKeys(pts, radii), segments: 48, radial: 22, round: [0.08, 0.02], power: 2.1 }), mat: "leg" });
    const foot = pts[pts.length - 1];
    const tk = Math.max(0.55, t);
    if (s.legs.foot === "pad") {
      limbs.push({ geo: SPH, mat: "leg", pos: [foot[0] - 0.03, 0.035, foot[2]], scl: [0.12, 0.036, 0.1] });
      for (const c of [-1, 1]) limbs.push({ geo: SPH, mat: "hoof", pos: [foot[0] - 0.13, 0.03, foot[2] + c * 0.035], scl: [0.025, 0.018, 0.02] });
    } else {
      const hh = s.legs.foot === "trotter" ? 0.06 : 0.078;
      for (const c of [-1, 1]) {
        limbs.push({ geo: CYL, mat: "hoof", pos: [foot[0] - 0.012, (hh * tk) / 2, foot[2] + c * 0.025 * tk], rot: [0, 0, 0.2], scl: [0.048 * tk, hh * tk, 0.028 * tk] });
      }
    }
    anchors.hooves.push([foot[0] - 0.02, 0.05, foot[2]]);
    anchors.legs.push(pts[2]);
    legBones.push({ geo: tube(pts.slice(0, -1), 0.034 * t, 0.022 * t, { segments: 30, radial: 8 }), mat: "bone", xray: true });
    for (const j of pts.slice(1, -1)) legBones.push({ geo: SPH, mat: "bone", pos: j, scl: [0.04 * t, 0.04 * t, 0.04 * t], xray: true });
    void i;
  });
  // move the +z side legs to the front of the anchor lists so markers face the default camera
  anchors.legs.sort((a, b) => b[2] - a[2]);
  anchors.hooves.sort((a, b) => b[2] - a[2]);

  // ---------- udder ----------
  const female = s.udder !== "none";
  if (s.udder === "cow" || s.udder === "goat") {
    const cow = s.udder === "cow";
    const u: V3 = [bx - 0.15, Y - B * 0.93 - 0.02, 0];
    limbs.push({ geo: SPH, mat: "skin", pos: u, scl: cow ? [0.2, 0.14, 0.17] : [0.12, 0.1, 0.12] });
    const teats: V3[] = cow ? [[0.08, 0.07, 1], [-0.08, 0.07, 1], [0.08, -0.07, 1], [-0.08, -0.07, 1]] : [[0, 0.05, 1], [0, -0.05, 1]];
    for (const [dx, dz] of teats) limbs.push({ geo: CYL, mat: "skin", pos: [u[0] + dx, u[1] - (cow ? 0.15 : 0.11), dz], rot: [Math.PI, 0, 0], scl: [0.02, cow ? 0.075 : 0.06, 0.02] });
    anchors.udder = [[u[0], u[1] - 0.04, cow ? 0.13 : 0.09]];
  } else if (s.udder === "sow") {
    for (let i = 0; i < 6; i++) {
      for (const sd of [-1, 1]) limbs.push({ geo: SPH, mat: "skin", pos: [-L * 0.22 + i * L * 0.08, Y - B * 0.97, sd * W * 0.26], scl: [0.022, 0.028, 0.022] });
    }
    anchors.udder = [[0, Y - B * 0.95, W * 0.3]];
  }

  // ---------- tail ----------
  const tb: V3 = [rumpX - 0.03, Y + H * 0.72, 0];
  const tailParts: Part[] = [];
  const len = s.tail.len;
  if (s.tail.style === "hang") {
    const end: V3 = [tb[0] + 0.1, Math.max(0.2, tb[1] - len), 0];
    tailParts.push({ geo: tube([tb, [tb[0] + 0.09, tb[1] - 0.08, 0], [tb[0] + 0.12, tb[1] - len * 0.45, 0], end], s.tail.r, s.tail.r * 0.45, { segments: 36, radial: 12 }), mat: "coat" });
    if (s.tail.tuft) tailParts.push({ geo: SPH, mat: "tuft", pos: [end[0], end[1] - s.tail.tuft * 0.55, 0], scl: [0.045, s.tail.tuft, 0.045] });
  } else if (s.tail.style === "up") {
    const end: V3 = [tb[0] + 0.07, tb[1] + len, 0];
    tailParts.push({ geo: tube([tb, [tb[0] + 0.05, tb[1] + 0.06, 0], end], s.tail.r, s.tail.r * 0.5, { segments: 16, radial: 10 }), mat: "coat" });
    tailParts.push({ geo: SPH, mat: "tuft", pos: add(end, [0.01, 0.02, 0]), scl: [0.03, s.tail.tuft, 0.03] });
  } else if (s.tail.style === "curl") {
    const pts: V3[] = [];
    for (let i = 0; i <= 10; i++) {
      const ang = (i / 10) * Math.PI * 2.3;
      pts.push([tb[0] + 0.02 + i * 0.013, tb[1] - 0.03 + 0.035 * Math.sin(ang), 0.035 * Math.cos(ang) - 0.035]);
    }
    tailParts.push({ geo: tube(pts, s.tail.r, s.tail.r * 0.55, { segments: 40, radial: 10 }), mat: "coat" });
  } else {
    tailParts.push({
      geo: loft({
        points: [tb, [tb[0] + 0.07, tb[1] - 0.08, 0], [tb[0] + 0.09, tb[1] - len, 0]],
        keys: [[0, s.tail.r, s.tail.r, s.tail.r], [1, s.tail.r * 0.75, s.tail.r * 0.75, s.tail.r * 0.75]],
        segments: 20,
        radial: 18,
        round: [0.1, 0.3],
        displace: s.wool ? (tt, a) => 0.02 + 0.01 * Math.sin(a * 8 + tt * 30) : undefined,
      }),
      mat: "coat",
    });
  }

  // ---------- skeleton + organs (x-ray) ----------
  const hump = s.hump;
  const spinePts: V3[] = [[rumpX + 0.02, Y + H * 0.6, 0], [0, Y + H * 0.68, 0], [chestX + 0.3, Y + H * 0.72 + hump * 0.35, 0], add(nBase, [0, 0.02, 0])];
  for (let i = 0; i < 30; i++) {
    body.push({ geo: SPH, mat: "bone", pos: pointOnCurve(spinePts, i / 29), scl: [0.03 * K, 0.034 * K, 0.034 * K], xray: true });
  }
  for (let i = 0; i < 11; i++) {
    const x = chestX + 0.24 + (i / 10) * (L * 0.5);
    for (const g of ribArc(x, Y + 0.02, W * 0.86, H * 0.7, B * (0.72 + 0.12 * Math.sin((i / 10) * Math.PI)), 0.012 * K)) body.push({ geo: g, mat: "bone", xray: true });
  }
  body.push({ geo: SPH, mat: "bone", pos: [rumpX - 0.18, Y + H * 0.3, 0], scl: [0.17, 0.1, W * 0.62], xray: true });
  for (const sd of [1, -1]) body.push({ geo: SPH, mat: "bone", pos: [chestX + 0.32, Y + H * 0.28, sd * W * 0.74], rot: [0, 0, 0.35], scl: [0.12, 0.22 * K, 0.02], xray: true });
  body.push(...legBones);
  for (const sd of [1, -1]) body.push({ geo: SPH, mat: "lung", pos: [chestX + L * 0.2, Y + H * 0.18, sd * W * 0.38], scl: [L * 0.13, H * 0.75, W * 0.33], xray: true });
  body.push({ geo: SPH, mat: "heart", pos: [chestX + L * 0.2, Y - B * 0.38, 0.02], scl: [0.09 * K, 0.11 * K, 0.08 * K], xray: true });
  body.push({ geo: SPH, mat: "organ", pos: [chestX + L * 0.34, Y - B * 0.12, -W * 0.36], scl: [0.16 * K, 0.12 * K, 0.1 * K], xray: true });
  if (s.organs === "ruminant") {
    body.push({ geo: SPH, mat: "organ", pos: [L * 0.06, Y - B * 0.22, W * 0.3], scl: [L * 0.2, B * 0.6, W * 0.52], xray: true });
    body.push({ geo: SPH, mat: "organ", pos: [-L * 0.1, Y - B * 0.5, -W * 0.1], scl: [0.12 * K, 0.1 * K, 0.12 * K], xray: true });
    body.push({ geo: KNOT, mat: "organ", pos: [L * 0.22, Y - B * 0.35, -W * 0.3], scl: [0.13 * K, 0.13 * K, 0.13 * K], xray: true });
  } else {
    body.push({ geo: SPH, mat: "organ", pos: [-L * 0.05, Y - B * 0.28, W * 0.25], scl: [0.15 * K, 0.11 * K, 0.13 * K], xray: true });
    body.push({ geo: KNOT, mat: "organ", pos: [L * 0.14, Y - B * 0.3, 0], scl: [0.19 * K, 0.17 * K, 0.19 * K], xray: true });
  }

  // ---------- anchors ----------
  anchors.head = [add(add(hStart, hdir, hs.len * 0.18), hUp, h * 0.95)];
  anchors.mouth = [add(hEnd, hdir, 0.02), add(add(hEnd, hdir, -0.06), hUp, -m * 0.85)];
  const nm = (r0 + r1) / 2;
  anchors.neck = [add(nMid, [0, 0, nm * 0.85]), add(nMid, [0, 0, -nm * 0.85]), add(nMid, [0, -nm * 0.9, 0])];
  anchors.respiratory = [[chestX + L * 0.14, Y + 0.02, W * 0.9], [chestX + L * 0.14, Y + 0.02, -W * 0.9]];
  anchors.skin = [[L * 0.05, Y + H * 0.55, W * 0.82], [-L * 0.2, Y + H * 0.85, 0], [L * 0.28, Y + H * 0.6, W * 0.72], [L * 0.05, Y + H * 0.55, -W * 0.82]];
  anchors.abdomen = [[L * 0.05, Y - B * 0.7, W * 0.76], [L * 0.05, Y - B * 0.7, -W * 0.76]];
  if (!female) delete anchors.udder;

  const head: Pivoted = { pivot: add(nBase, ndir, 0.05), parts: headParts };
  const height = Math.max(Y + H + s.hump + 0.05, hStart[1] + h + 0.1, anchors.head[0][1] + (s.horns === "lyre" ? 0.45 : 0.15));
  return {
    kind: "quad",
    body,
    limbs,
    head,
    ears,
    tail: { pivot: tb, parts: tailParts },
    anchors,
    radii: { head: 0.28 * K, eyes: 0.1, mouth: 0.19 * K, neck: 0.3 * K, respiratory: 0.36 * K, skin: 0.5 * K, abdomen: 0.42 * K, udder: 0.26 * K, legs: 0.24, hooves: 0.16 },
    breathe: [0, Y, 0],
    height,
    center: [-0.1, Math.min(height * 0.5, Y), 0],
    breathRate: s.breath,
  };
}

function buildBird(sex: string): Rig {
  const male = sex === "male";
  const body: Part[] = [];
  const limbs: Part[] = [];
  const headParts: Part[] = [];
  const tailParts: Part[] = [];
  const scallop = (amt: number) => (t: number, a: number) => amt * Math.abs(Math.sin(t * 70)) * (0.6 + 0.4 * Math.sin(a * 10 + t * 25));

  const bodyPts: V3[] = [[0.62, 1.42, 0], [0.25, 1.22, 0], [-0.15, 1.12, 0], [-0.46, 1.22, 0]];
  body.push({
    geo: loft({ points: bodyPts, keys: [[0, 0.1, 0.12, 0.1], [0.2, 0.28, 0.3, 0.32], [0.5, 0.33, 0.34, 0.4], [0.8, 0.3, 0.34, 0.36], [1, 0.2, 0.24, 0.22]], segments: 70, radial: 50, round: [0.15, 0.2], displace: scallop(0.01) }),
    mat: "feather",
  });
  for (const sd of [1, -1]) {
    body.push({
      geo: loft({
        points: [[-0.28, 1.34, sd * 0.33], [0.12, 1.33, sd * 0.37], [0.5, 1.3, sd * 0.35], [0.72, 1.24, sd * 0.27]],
        keys: [[0, 0.1, 0.03, 0.03], [0.3, 0.19, 0.035, 0.035], [0.7, 0.16, 0.03, 0.03], [1, 0.05, 0.015, 0.015]],
        segments: 40,
        radial: 24,
        round: [0.1, 0.15],
        refUp: [0, 0, 1],
        displace: scallop(0.006),
      }),
      mat: "feather",
    });
    for (let i = 0; i < 5; i++) {
      body.push({
        geo: loft({
          points: [[0.34 + i * 0.06, 1.25 - i * 0.02, sd * 0.35], [0.56 + i * 0.05, 1.2 - i * 0.03, sd * 0.33], [0.74 + i * 0.03, 1.14 - i * 0.035, sd * 0.29]],
          keys: [[0, 0.035, 0.008, 0.008], [0.6, 0.04, 0.008, 0.008], [1, 0.012, 0.004, 0.004]],
          segments: 16,
          radial: 10,
          round: [0.05, 0.25],
          refUp: [0, 0, 1],
        }),
        mat: "featherDark",
      });
    }
  }

  // tail
  const tailN = male ? 5 : 6;
  for (let k = 0; k < tailN; k++) {
    const kk = k - (tailN - 1) / 2;
    const z = kk * 0.035;
    const pts: V3[] = male
      ? [[0.58, 1.46, z], [0.8, 1.8 + 0.02 * Math.abs(kk), z * 1.5], [1.02, 1.82 - 0.05 * Math.abs(kk), z * 2], [1.14, 1.5 - 0.06 * Math.abs(kk), z * 2.2]]
      : [[0.58, 1.44, z], [0.7, 1.62, z * 1.6], [0.8, 1.76 - 0.03 * Math.abs(kk), z * 2.2]];
    tailParts.push({
      geo: loft({ points: pts, keys: [[0, 0.045, 0.008, 0.008], [0.5, male ? 0.05 : 0.055, 0.008, 0.008], [1, 0.018, 0.005, 0.005]], segments: 30, radial: 10, round: [0, 0.2], refUp: [0, 0, 1] }),
      mat: "featherDark",
    });
  }

  // neck + head
  const neckPts: V3[] = [[-0.3, 1.32, 0], [-0.44, 1.55, 0], [-0.52, 1.8, 0], [-0.55, 1.93, 0]];
  headParts.push({ geo: loft({ points: neckPts, keys: [[0, 0.19, 0.19, 0.2], [0.4, 0.13, 0.13, 0.14], [1, 0.1, 0.1, 0.1]], segments: 40, radial: 36, round: [0, 0.1], displace: scallop(0.012) }), mat: "feather" });
  headParts.push({ geo: SPH, mat: "face", pos: [-0.55, 1.98, 0], scl: [0.13, 0.12, 0.105] });
  headParts.push({ geo: tube([[-0.655, 1.995, 0], [-0.72, 1.98, 0], [-0.79, 1.952, 0]], 0.036, 0.004, { segments: 16, radial: 14 }), mat: "beak" });
  headParts.push({ geo: tube([[-0.655, 1.97, 0], [-0.72, 1.955, 0], [-0.76, 1.945, 0]], 0.022, 0.004, { segments: 12, radial: 10 }), mat: "beak" });
  const combK = male ? 1 : 0.55;
  headParts.push({ geo: SPH, mat: "comb", pos: [-0.56, 2.075, 0], scl: [0.1 * combK, 0.03 * combK, 0.012] });
  for (let i = 0; i < 5; i++) {
    headParts.push({ geo: SPH, mat: "comb", pos: [-0.64 + i * 0.045, 2.1 + (0.05 - Math.abs(i - 2) * 0.012) * combK, 0], scl: [0.026 * combK, (0.06 - Math.abs(i - 2) * 0.008) * combK, 0.012] });
  }
  for (const sd of [1, -1]) {
    headParts.push({ geo: SPH, mat: "comb", pos: [-0.64, 1.86, sd * 0.028], scl: [0.03 * combK + 0.01, 0.055 * combK + 0.015, 0.016] });
    headParts.push({ geo: SPH, mat: "eye", pos: [-0.6, 2.0, sd * 0.09], scl: [0.022, 0.022, 0.022] });
    headParts.push({ geo: TOR, mat: "beak", pos: [-0.6, 2.0, sd * 0.093], scl: [0.026, 0.026, 0.02] });
  }
  for (let i = 0; i < 8; i++) headParts.push({ geo: SPH, mat: "bone", pos: pointOnCurve(neckPts, 0.1 + (i / 7) * 0.9), scl: [0.025, 0.022, 0.025], xray: true });
  headParts.push({ geo: SPH, mat: "bone", pos: [-0.55, 1.98, 0], scl: [0.09, 0.085, 0.075], xray: true });

  // legs
  const legBones: Part[] = [];
  for (const sd of [1, -1]) {
    const z = sd * 0.13;
    limbs.push({ geo: loft({ points: [[0.1, 0.98, z], [0.07, 0.84, z], [0.05, 0.7, z]], keys: [[0, 0.12, 0.13, 0.13], [0.6, 0.09, 0.1, 0.1], [1, 0.045, 0.05, 0.05]], segments: 24, radial: 20, round: [0.1, 0.2], displace: scallop(0.008) }), mat: "feather" });
    const shank: V3[] = [[0.05, 0.74, z], [0.03, 0.42, z], [0, 0.08, z]];
    limbs.push({ geo: tube(shank, 0.032, 0.026, { segments: 24, radial: 12, tip: false }), mat: "shank" });
    for (const dz of [-0.075, 0, 0.075]) limbs.push({ geo: tube([[0, 0.06, z], [-0.1, 0.035, z + dz * 0.6], [-0.22, 0.02, z + dz]], 0.018, 0.007, { segments: 14, radial: 8 }), mat: "shank" });
    limbs.push({ geo: tube([[0, 0.06, z], [0.07, 0.035, z], [0.12, 0.025, z]], 0.016, 0.007, { segments: 10, radial: 8 }), mat: "shank" });
    if (male) limbs.push({ geo: tube([[0.02, 0.24, z], [0.06, 0.23, z], [0.08, 0.25, z]], 0.012, 0.003, { segments: 8, radial: 8 }), mat: "beak" });
    legBones.push({ geo: tube([[0.1, 0.98, z], [0.05, 0.72, z], [0.03, 0.42, z], [0, 0.08, z]], 0.02, 0.014, { segments: 24, radial: 8 }), mat: "bone", xray: true });
  }

  // skeleton + organs
  const spine: V3[] = [[0.6, 1.4, 0], [0.2, 1.46, 0], [-0.25, 1.4, 0], [-0.32, 1.35, 0]];
  for (let i = 0; i < 16; i++) body.push({ geo: SPH, mat: "bone", pos: pointOnCurve(spine, i / 15), scl: [0.026, 0.026, 0.026], xray: true });
  body.push({ geo: loft({ points: [[0.12, 0.82, 0], [-0.18, 0.8, 0], [-0.38, 1.0, 0]], keys: [[0, 0.012, 0.03, 0.06], [0.5, 0.012, 0.04, 0.09], [1, 0.012, 0.03, 0.05]], segments: 24, radial: 12, round: [0.1, 0.1] }), mat: "bone", xray: true });
  body.push(...legBones);
  for (const sd of [1, -1]) body.push({ geo: SPH, mat: "lung", pos: [-0.18, 1.32, sd * 0.12], scl: [0.14, 0.08, 0.08], xray: true });
  body.push({ geo: SPH, mat: "heart", pos: [-0.3, 1.1, 0], scl: [0.07, 0.08, 0.06], xray: true });
  body.push({ geo: SPH, mat: "organ", pos: [-0.4, 1.36, 0.05], scl: [0.07, 0.07, 0.07], xray: true });
  body.push({ geo: SPH, mat: "organ", pos: [0.05, 1.0, 0], scl: [0.1, 0.09, 0.09], xray: true });
  body.push({ geo: KNOT, mat: "organ", pos: [0.25, 1.1, 0], scl: [0.1, 0.1, 0.1], xray: true });

  return {
    kind: "bird",
    body,
    limbs,
    head: { pivot: [-0.36, 1.4, 0], parts: headParts },
    ears: [],
    tail: { pivot: [0.58, 1.44, 0], parts: tailParts },
    anchors: {
      head: [[-0.54, 2.12, 0]],
      eyes: [[-0.6, 2.0, 0.11], [-0.6, 2.0, -0.11]],
      mouth: [[-0.75, 1.97, 0]],
      neck: [[-0.48, 1.66, 0.13], [-0.48, 1.66, -0.13]],
      respiratory: [[-0.4, 1.2, 0.26], [-0.4, 1.2, -0.26]],
      skin: [[0.1, 1.48, 0.3], [0.2, 1.56, 0], [0.1, 1.48, -0.3]],
      abdomen: [[0.35, 1.0, 0.14], [0.35, 1.0, -0.14]],
      legs: [[0.02, 0.42, 0.13], [0.02, 0.42, -0.13]],
      hooves: [[-0.08, 0.03, 0.13], [-0.08, 0.03, -0.13]],
    },
    radii: { head: 0.2, eyes: 0.08, mouth: 0.12, neck: 0.22, respiratory: 0.3, skin: 0.42, abdomen: 0.3, legs: 0.2, hooves: 0.16 },
    breathe: [0, 1.2, 0],
    height: 2.2,
    center: [0.05, 1.15, 0],
    breathRate: 3,
  };
}

const cache = new Map<string, Rig>();

export function getRig(species: string, breed: string, sex: string) {
  const key = `${species}|${breed}|${sex}`;
  let rig = cache.get(key);
  if (!rig) {
    rig = species === "poultry" ? buildBird(sex) : buildQuad(species, breed, sex);
    cache.set(key, rig);
  }
  return rig;
}

export function nearestRegion(rig: Rig, p: { x: number; y: number; z: number }, allowed: string[]) {
  let best: string | null = null;
  let bd = Infinity;
  for (const r of allowed) {
    for (const a of rig.anchors[r] || []) {
      const d = Math.hypot(a[0] - p.x, a[1] - p.y, a[2] - p.z) - (rig.radii[r] ?? 0.3) * 0.35;
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
  }
  return best;
}
