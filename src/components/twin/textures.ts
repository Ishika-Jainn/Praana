import * as THREE from "three";

export type Coat = {
  base: string;
  shade: string;
  belly: string;
  pattern: "solid" | "patches" | "mottled" | "speckled" | "iridescent";
  patch?: string;
  patchAmt?: number;
  sock?: string;
  face?: string;
  muzzle: string;
  horn: string;
  hoof: string;
  skin: string;
  tuft: string;
  sheen: string;
  roughness: number;
  wool?: boolean;
  comb?: string;
  beak?: string;
  shank?: string;
  tail?: string;
};

const C = (c: Partial<Coat> & Pick<Coat, "base">): Coat => ({
  shade: c.base,
  belly: c.base,
  pattern: "solid",
  muzzle: "#2a211d",
  horn: "#cdbb98",
  hoof: "#1f1814",
  skin: "#e7b8a6",
  tuft: "#1b1512",
  sheen: "#ffffff",
  roughness: 0.78,
  ...c,
});

export const COATS: Record<string, Coat> = {
  Gir: C({ base: "#a8532a", shade: "#6e2f16", belly: "#c7835a", pattern: "mottled", patch: "#efdcc4", patchAmt: 26, muzzle: "#3a2a24", horn: "#2b2420", sheen: "#ffd9b8" }),
  Khillar: C({ base: "#e9e5dc", shade: "#8e908b", belly: "#f4f1ea", face: "#d8d5ce", muzzle: "#3b3a38", horn: "#e9dcc2", hoof: "#3c3833", sheen: "#ffffff" }),
  Deoni: C({ base: "#f3eee4", shade: "#d8d1c3", belly: "#faf7f1", pattern: "patches", patch: "#1d1a19", patchAmt: 9, muzzle: "#2c2624", horn: "#d8c7a4" }),
  Sahiwal: C({ base: "#9b4f2c", shade: "#5f2c16", belly: "#c3825a", muzzle: "#2d211c", horn: "#3a2f28" }),
  "HF cross": C({ base: "#f6f4f0", shade: "#e2ddd4", belly: "#fbfaf7", pattern: "patches", patch: "#141313", patchAmt: 12, sock: "#f6f4f0", muzzle: "#caa198", horn: "#e6dcc8", skin: "#f1c4b6", tuft: "#f1eee8" }),
  "Jersey cross": C({ base: "#a8713f", shade: "#5b3a22", belly: "#d8b387", muzzle: "#1f1a18", horn: "#d8c7a4", sock: "#4a3020" }),
  "Non-descript": C({ base: "#8a6a4e", shade: "#4d3827", belly: "#b8987a" }),
  Murrah: C({ base: "#1e2124", shade: "#0f1113", belly: "#34383b", muzzle: "#131516", horn: "#15171a", hoof: "#101112", skin: "#3a3434", tuft: "#0c0d0e", sheen: "#9aa7b0", roughness: 0.55 }),
  Pandharpuri: C({ base: "#2c3136", shade: "#16191c", belly: "#434a50", muzzle: "#161819", horn: "#1c1d1f", hoof: "#121314", skin: "#403838", tuft: "#0e0f10", sheen: "#9aa7b0", roughness: 0.58 }),
  Mehsana: C({ base: "#26292c", shade: "#131517", belly: "#3c4145", muzzle: "#141617", horn: "#17191b", skin: "#3a3434", sheen: "#9aa7b0", roughness: 0.56 }),
  Jaffarabadi: C({ base: "#1a1c1e", shade: "#0d0e0f", belly: "#2e3134", muzzle: "#111213", horn: "#141516", skin: "#353030", sheen: "#9aa7b0", roughness: 0.55 }),
  Osmanabadi: C({ base: "#161514", shade: "#0b0a0a", belly: "#2a2826", muzzle: "#1d1a19", horn: "#2a2522", skin: "#3a3230", tuft: "#0d0c0c", sheen: "#8f98a0", roughness: 0.5 }),
  Sangamneri: C({ base: "#efe9df", shade: "#c9bba5", belly: "#f7f3ec", pattern: "speckled", patch: "#8a5a3a", patchAmt: 90, muzzle: "#c79d93", horn: "#d9ccb1", skin: "#efc5b8", tuft: "#e8dfd0" }),
  Beetal: C({ base: "#6b3a22", shade: "#3d1f11", belly: "#8a5a3a", pattern: "patches", patch: "#efe6d8", patchAmt: 6, muzzle: "#2c201b" }),
  "Black Bengal": C({ base: "#151414", shade: "#0a0a0a", belly: "#262424", muzzle: "#1c1a19", sheen: "#8f98a0", roughness: 0.5 }),
  Deccani: C({ base: "#2e2b29", shade: "#1a1817", belly: "#3d3935", face: "#1f1d1c", muzzle: "#141313", horn: "#b9a78a", skin: "#3b3432", tuft: "#1b1918", wool: true, roughness: 0.96, sheen: "#6b6560" }),
  Madgyal: C({ base: "#ece5d7", shade: "#cfc4b0", belly: "#f4efe6", face: "#8a5b3b", muzzle: "#3a2b25", horn: "#d8c9ad", skin: "#e7b8a6", tuft: "#e3dbcc", wool: true, roughness: 0.97, sheen: "#ffffff" }),
  Nellore: C({ base: "#b98a5c", shade: "#7d5635", belly: "#d2ad85", muzzle: "#2e231e", roughness: 0.7 }),
  "Large White Yorkshire": C({ base: "#f1cabd", shade: "#e3ad9d", belly: "#f6d8ce", muzzle: "#e89b8d", hoof: "#8c7266", skin: "#efb3a3", tuft: "#e8b9aa", sheen: "#fff1ea", roughness: 0.62 }),
  "LWY cross": C({ base: "#ecbdad", shade: "#d9a18f", belly: "#f3cfc2", pattern: "patches", patch: "#5d5552", patchAmt: 5, muzzle: "#e19686", hoof: "#6e5a52", skin: "#e8a999", tuft: "#d9a697", sheen: "#fff1ea", roughness: 0.62 }),
  Ghungroo: C({ base: "#1f1c1c", shade: "#0f0e0e", belly: "#2d2a29", muzzle: "#2a2322", hoof: "#1a1616", skin: "#352c2b", tuft: "#141212", roughness: 0.6 }),
  Marwari: C({ base: "#c49a63", shade: "#8e6a3e", belly: "#d9b98e", muzzle: "#6d5234", hoof: "#3f3226", skin: "#b78e62", tuft: "#7c5b37", roughness: 0.92, sheen: "#ffe6c4" }),
  Bikaneri: C({ base: "#a87a4a", shade: "#6f4c2a", belly: "#c49b70", muzzle: "#5a4028", hoof: "#3a2d22", tuft: "#65462a", roughness: 0.92 }),
  Jaisalmeri: C({ base: "#d4b184", shade: "#9d7c52", belly: "#e3caa6", muzzle: "#7c6040", tuft: "#8b6b45", roughness: 0.92 }),
  Kadaknath: C({ base: "#101013", shade: "#060608", belly: "#18181c", pattern: "iridescent", patch: "#1d3b3a", comb: "#3b1d2e", beak: "#1c1a1c", shank: "#1a191b", tail: "#0b0c10", sheen: "#5fd1c1", roughness: 0.45 }),
  Giriraja: C({ base: "#8e4f24", shade: "#5a2d12", belly: "#b87a44", pattern: "mottled", patch: "#2a1a10", patchAmt: 40, comb: "#c4221c", beak: "#d8a33a", shank: "#d9a53a", tail: "#15201f", sheen: "#ffd8a8", roughness: 0.6 }),
  Aseel: C({ base: "#7a2e1a", shade: "#3f140a", belly: "#a14a2a", comb: "#b51f1a", beak: "#e0b659", shank: "#e3b35a", tail: "#0f1412", sheen: "#ffcf9e", roughness: 0.55 }),
  "White Leghorn": C({ base: "#f6f4ef", shade: "#e1ddd4", belly: "#fbfaf7", comb: "#d32a22", beak: "#e8c15a", shank: "#e9c35a", tail: "#f3f0ea", sheen: "#ffffff", roughness: 0.66 }),
};

const DEFAULT_BREED: Record<string, string> = {
  cattle: "Gir",
  buffalo: "Murrah",
  goat: "Osmanabadi",
  sheep: "Deccani",
  pig: "Large White Yorkshire",
  camel: "Marwari",
  poultry: "Kadaknath",
};

export function coatFor(species: string, breed: string) {
  return COATS[breed] || COATS[DEFAULT_BREED[species] || "Gir"];
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

const cache = new Map<string, THREE.Texture>();

function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number, rand: () => number, W: number, H: number) {
  for (let k = 0; k < 7; k++) {
    const ox = x + (rand() - 0.5) * r * 1.3;
    const oy = y + (rand() - 0.5) * r * 0.9;
    const rr = r * (0.45 + rand() * 0.6);
    for (const dx of [-W, 0, W]) {
      for (const dy of [-H, 0, H]) {
        g.beginPath();
        g.ellipse(ox + dx, oy + dy, rr, rr * (0.6 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}

/** Procedural coat for a body part. u runs along the part, v around it (v=0.5 is the underside). */
export function coatTexture(coat: Coat, part: "body" | "leg" | "head", seedKey: string) {
  const key = `${seedKey}-${part}-${coat.base}-${coat.pattern}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const rand = rng(hash(key));

  // dorsal → belly gradient
  const grad = g.createLinearGradient(0, 0, 0, H);
  const top = part === "head" && coat.face ? coat.face : coat.shade;
  grad.addColorStop(0, top);
  grad.addColorStop(0.22, coat.base);
  grad.addColorStop(0.5, part === "leg" ? coat.base : coat.belly);
  grad.addColorStop(0.78, coat.base);
  grad.addColorStop(1, top);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  if (part === "head" && coat.face) {
    g.fillStyle = coat.face;
    g.globalAlpha = 0.7;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  }

  const amt = coat.patchAmt ?? 0;
  if (coat.pattern === "patches" && coat.patch) {
    g.fillStyle = coat.patch;
    const n = part === "leg" ? Math.ceil(amt / 3) : amt;
    for (let i = 0; i < n; i++) blob(g, rand() * W, rand() * H, 50 + rand() * 90, rand, W, H);
  }
  if (coat.pattern === "mottled" && coat.patch) {
    g.fillStyle = coat.patch;
    for (let i = 0; i < amt * 2; i++) {
      g.globalAlpha = 0.35 + rand() * 0.5;
      blob(g, rand() * W, rand() * H, 10 + rand() * 26, rand, W, H);
    }
    g.globalAlpha = 1;
  }
  if (coat.pattern === "speckled" && coat.patch) {
    g.fillStyle = coat.patch;
    for (let i = 0; i < amt * 6; i++) {
      g.globalAlpha = 0.3 + rand() * 0.5;
      g.beginPath();
      g.arc(rand() * W, rand() * H, 2 + rand() * 7, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  if (coat.pattern === "iridescent" && coat.patch) {
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = i % 2 ? coat.patch : "#2a2340";
      g.globalAlpha = 0.25;
      g.lineWidth = 3 + rand() * 5;
      const x = rand() * W;
      const y = rand() * H;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 20, y + 6, x + 44, y + 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  if (part === "leg" && coat.sock) {
    const s = g.createLinearGradient(0, 0, W, 0);
    s.addColorStop(0, "rgba(0,0,0,0)");
    s.addColorStop(0.6, "rgba(0,0,0,0)");
    s.addColorStop(0.78, coat.sock);
    s.addColorStop(1, coat.sock);
    g.fillStyle = s;
    g.fillRect(0, 0, W, H);
  }

  // hair strokes, lying along the part
  const strokes = coat.wool ? 0 : 14000;
  for (let i = 0; i < strokes; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const light = rand() > 0.5;
    g.strokeStyle = light ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 6 + rand() * 10, y + (rand() - 0.5) * 3);
    g.stroke();
  }
  if (coat.wool) {
    for (let i = 0; i < 9000; i++) {
      const x = rand() * W;
      const y = rand() * H;
      g.strokeStyle = rand() > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.12)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(x, y, 2 + rand() * 4, rand() * 6, rand() * 6 + 3);
      g.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

export function hairBump(wool = false) {
  const key = wool ? "bump-wool" : "bump-hair";
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 512;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext("2d")!;
  const rand = rng(hash(key));
  g.fillStyle = "#808080";
  g.fillRect(0, 0, S, S);
  if (wool) {
    for (let i = 0; i < 5000; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 3 + rand() * 7;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, "rgba(255,255,255,0.5)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    for (let i = 0; i < 26000; i++) {
      const x = rand() * S;
      const y = rand() * S;
      g.strokeStyle = rand() > 0.5 ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 5 + rand() * 7, y + (rand() - 0.5) * 2);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(wool ? 5 : 8, wool ? 3 : 4);
  cache.set(key, tex);
  return tex;
}

export function hornTexture(color: string) {
  const key = `horn-${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const g = canvas.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, "#6b5a47");
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, "#1d1915");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 64);
  for (let x = 0; x < 512; x += 6 + Math.random() * 8) {
    g.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.1})`;
    g.fillRect(x, 0, 2, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
