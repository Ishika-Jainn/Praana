import * as THREE from "three";

export type V3 = [number, number, number];

export function sampleKeys(keys: number[][], t: number, i: number) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][i];
  if (t >= keys[n - 1][0]) return keys[n - 1][i];
  let k = 0;
  while (k < n - 2 && t > keys[k + 1][0]) k++;
  const p0 = keys[Math.max(0, k - 1)];
  const p1 = keys[k];
  const p2 = keys[k + 1];
  const p3 = keys[Math.min(n - 1, k + 2)];
  const span = p2[0] - p1[0] || 1e-4;
  const u = (t - p1[0]) / span;
  const m1 = ((p2[i] - p0[i]) / Math.max(1e-4, p2[0] - p0[0])) * span;
  const m2 = ((p3[i] - p1[i]) / Math.max(1e-4, p3[0] - p1[0])) * span;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1[i] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[i] + (u3 - u2) * m2;
}

export function gauss(t: number, mu: number, sigma: number) {
  return Math.exp(-((t - mu) ** 2) / (2 * sigma * sigma));
}

export type LoftOpts = {
  points: V3[];
  keys: number[][]; // [t, halfWidth, halfTop, halfBottom]
  segments?: number;
  radial?: number;
  round?: [number, number];
  power?: number;
  refUp?: V3;
  topAdd?: (t: number) => number;
  bottomAdd?: (t: number) => number;
  displace?: (t: number, a: number) => number;
};

/**
 * Sweeps an elliptical / superelliptical cross-section along a smooth spine using
 * parallel-transport frames. Produces organic, continuous anatomy (bodies, limbs,
 * necks, horns, ears) with clean UVs for procedural coats.
 */
export function loft(o: LoftOpts) {
  const V = THREE.Vector3;
  const curve = new THREE.CatmullRomCurve3(o.points.map((p) => new V(...p)), false, "centripetal", 0.5);
  const S = o.segments ?? 56;
  const R = o.radial ?? 36;
  const pw = 2 / (o.power ?? 2);
  const [r0, r1] = o.round ?? [0, 0];

  let T = curve.getTangentAt(0).normalize();
  const ref = o.refUp ? new V(...o.refUp).normalize() : Math.abs(T.y) < 0.9 ? new V(0, 1, 0) : new V(1, 0, 0);
  const side = new V().crossVectors(T, ref).normalize();
  const up = new V().crossVectors(side, T).normalize();
  const q = new THREE.Quaternion();

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const P = new V();

  for (let i = 0; i <= S; i++) {
    const t = i / S;
    const Ti = curve.getTangentAt(t).normalize();
    if (i > 0) {
      q.setFromUnitVectors(T, Ti);
      up.applyQuaternion(q);
      side.applyQuaternion(q);
      T = Ti;
    }
    curve.getPointAt(t, P);
    let env = 1;
    if (r0 > 0 && t < r0) {
      const x = 1 - t / r0;
      env = Math.sqrt(Math.max(0.0009, 1 - x * x));
    }
    if (r1 > 0 && t > 1 - r1) {
      const x = 1 - (1 - t) / r1;
      env = Math.min(env, Math.sqrt(Math.max(0.0009, 1 - x * x)));
    }
    const w = sampleKeys(o.keys, t, 1) * env;
    const hT = (sampleKeys(o.keys, t, 2) + (o.topAdd?.(t) ?? 0)) * env;
    const hB = (sampleKeys(o.keys, t, 3) + (o.bottomAdd?.(t) ?? 0)) * env;
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const cu = Math.sign(c) * Math.abs(c) ** pw;
      const su = Math.sign(s) * Math.abs(s) ** pw;
      let rUp = cu * (c >= 0 ? hT : hB);
      let rSide = su * w;
      if (o.displace) {
        const d = o.displace(t, a) * env;
        const len = Math.hypot(rUp, rSide) || 1;
        rUp += (d * rUp) / len;
        rSide += (d * rSide) / len;
      }
      pos.push(P.x + up.x * rUp + side.x * rSide, P.y + up.y * rUp + side.y * rSide, P.z + up.z * rUp + side.z * rSide);
      uv.push(t, j / R);
    }
  }
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j;
      const b = (i + 1) * (R + 1) + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  // caps
  const start = curve.getPointAt(0);
  const end = curve.getPointAt(1);
  const cs = pos.length / 3;
  pos.push(start.x, start.y, start.z);
  uv.push(0, 0.5);
  const ce = cs + 1;
  pos.push(end.x, end.y, end.z);
  uv.push(1, 0.5);
  for (let j = 0; j < R; j++) {
    idx.push(cs, j + 1, j);
    const last = S * (R + 1);
    idx.push(ce, last + j, last + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const n = geo.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i <= S; i++) {
    const a = i * (R + 1);
    const b = a + R;
    const nx = n.getX(a) + n.getX(b);
    const ny = n.getY(a) + n.getY(b);
    const nz = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(a, nx / l, ny / l, nz / l);
    n.setXYZ(b, nx / l, ny / l, nz / l);
  }
  n.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/** Tapered round tube (horns, tails, bones, toes). */
export function tube(points: V3[], r0: number, r1: number, opts: { segments?: number; radial?: number; tip?: boolean; mid?: number[][] } = {}) {
  const keys: number[][] = [[0, r0, r0, r0], ...(opts.mid ?? []), [1, r1, r1, r1]];
  return loft({ points, keys, segments: opts.segments ?? 28, radial: opts.radial ?? 14, round: [0.04, opts.tip === false ? 0.04 : 0.14] });
}

export const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const mix3 = (...terms: [V3, number][]): V3 =>
  terms.reduce<V3>((acc, [v, k]) => [acc[0] + v[0] * k, acc[1] + v[1] * k, acc[2] + v[2] * k], [0, 0, 0]);
export const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export function pointOnCurve(points: V3[], t: number): V3 {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.5);
  const p = c.getPointAt(t);
  return [p.x, p.y, p.z];
}

export function ribArc(x: number, cy: number, halfW: number, top: number, bottom: number, r: number) {
  const pts: V3[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI;
    pts.push([x + Math.sin(a) * 0.03, cy + Math.cos(a) * (Math.cos(a) > 0 ? top : bottom), Math.sin(a) * halfW]);
  }
  const right = tube(pts, r, r * 0.7, { segments: 20, radial: 6, tip: false });
  const left = tube(pts.map(([px, py, pz]) => [px, py, -pz] as V3), r, r * 0.7, { segments: 20, radial: 6, tip: false });
  return [right, left];
}
