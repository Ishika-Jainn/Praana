import * as THREE from "three";
import { coatFor, coatTexture, hairBump, hornTexture } from "./textures";

export const MAX_HOT = 16;

export type Heat = {
  uHot: { value: THREE.Vector4[] };
  uHotCount: { value: number };
  uTime: { value: number };
  uSel: { value: THREE.Vector4 };
  uScan: { value: THREE.Vector3 };
  uFloor: { value: number };
  uHeight: { value: number };
  uFever: { value: number };
};

export function createHeat(): Heat {
  return {
    uHot: { value: Array.from({ length: MAX_HOT }, () => new THREE.Vector4(0, -99, 0, 0)) },
    uHotCount: { value: 0 },
    uTime: { value: 0 },
    uSel: { value: new THREE.Vector4(0, 0, 0, 0) },
    uScan: { value: new THREE.Vector3(0, 0, 0) },
    uFloor: { value: 0 },
    uHeight: { value: 2.2 },
    uFever: { value: 0 },
  };
}

const HEAT_GLSL = /* glsl */ `
uniform vec4 uHot[${MAX_HOT}];
uniform int uHotCount;
uniform float uTime;
uniform vec4 uSel;
uniform vec3 uScan;
float twinHeat(vec3 p) {
  float h = 0.0;
  for (int i = 0; i < ${MAX_HOT}; i++) {
    if (i >= uHotCount) break;
    float d = distance(p, uHot[i].xyz);
    h = max(h, 1.0 - smoothstep(uHot[i].w * 0.25, uHot[i].w, d));
  }
  return h;
}
float twinRings(vec3 p) {
  float r = 0.0;
  for (int i = 0; i < ${MAX_HOT}; i++) {
    if (i >= uHotCount) break;
    float d = distance(p, uHot[i].xyz);
    float f = fract(d * 9.0 / max(uHot[i].w, 0.1) * 0.35 - uTime * 0.8);
    r = max(r, smoothstep(0.84, 1.0, f) * (1.0 - smoothstep(uHot[i].w * 0.4, uHot[i].w * 1.35, d)));
  }
  return r;
}
float twinSel(vec3 p) {
  if (uSel.w <= 0.0) return 0.0;
  float d = distance(p, uSel.xyz);
  return 1.0 - smoothstep(uSel.w * 0.3, uSel.w, d);
}
`;

function inject(mat: THREE.Material, heat: Heat, strength = 1) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uHot: heat.uHot,
      uHotCount: heat.uHotCount,
      uTime: heat.uTime,
      uSel: heat.uSel,
      uScan: heat.uScan,
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTwinWorld;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvTwinWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vTwinWorld;\n${HEAT_GLSL}`)
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float th = twinHeat(vTwinWorld);
        float tr = twinRings(vTwinWorld);
        float ts = twinSel(vTwinWorld);
        float pulse = 0.72 + 0.28 * sin(uTime * 3.1);
        vec3 hc = mix(vec3(1.0, 0.62, 0.2), vec3(1.0, 0.16, 0.07), smoothstep(0.35, 1.0, th));
        diffuseColor.rgb = mix(diffuseColor.rgb, hc * 0.85, th * 0.5 * ${strength.toFixed(2)});
        totalEmissiveRadiance += hc * (th * th * 0.75 * pulse + tr * 0.7) * ${strength.toFixed(2)};
        totalEmissiveRadiance += vec3(0.22, 0.95, 0.85) * ts * (0.22 + 0.1 * sin(uTime * 4.0));
        if (uScan.z > 0.5) {
          float band = exp(-pow((vTwinWorld.y - uScan.x) * 24.0, 2.0));
          totalEmissiveRadiance += vec3(0.3, 1.0, 0.88) * band * uScan.y;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `twin-heat-${strength}`;
  return mat;
}

const COMMON_VERT = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export function thermalMaterial(heat: Heat) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHot: heat.uHot,
      uHotCount: heat.uHotCount,
      uTime: heat.uTime,
      uSel: heat.uSel,
      uScan: heat.uScan,
      uFloor: heat.uFloor,
      uHeight: heat.uHeight,
      uFever: heat.uFever,
    },
    vertexShader: COMMON_VERT,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      varying vec3 vN;
      uniform float uFloor;
      uniform float uHeight;
      uniform float uFever;
      ${HEAT_GLSL}
      vec3 pal(float t) {
        vec3 c0 = vec3(0.02, 0.02, 0.12);
        vec3 c1 = vec3(0.2, 0.05, 0.55);
        vec3 c2 = vec3(0.62, 0.08, 0.6);
        vec3 c3 = vec3(0.93, 0.18, 0.42);
        vec3 c4 = vec3(1.0, 0.45, 0.05);
        vec3 c5 = vec3(1.0, 0.82, 0.1);
        vec3 c6 = vec3(1.0, 0.98, 0.86);
        if (t < 0.18) return mix(c0, c1, t / 0.18);
        if (t < 0.36) return mix(c1, c2, (t - 0.18) / 0.18);
        if (t < 0.52) return mix(c2, c3, (t - 0.36) / 0.16);
        if (t < 0.68) return mix(c3, c4, (t - 0.52) / 0.16);
        if (t < 0.85) return mix(c4, c5, (t - 0.68) / 0.17);
        return mix(c5, c6, clamp((t - 0.85) / 0.15, 0.0, 1.0));
      }
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        float hgt = clamp((vW.y - uFloor) / uHeight, 0.0, 1.0);
        float core = 0.26 + 0.3 * smoothstep(0.1, 0.55, hgt);
        float rim = pow(1.0 - abs(dot(n, v)), 2.0);
        float t = core - rim * 0.14 + twinHeat(vW) * 0.62 + uFever * 0.07;
        t += 0.018 * sin(vW.x * 9.0 + uTime * 0.7) * sin(vW.z * 11.0 + vW.y * 5.0);
        t = clamp(t, 0.0, 1.0);
        vec3 col = pal(t);
        float iso = smoothstep(0.955, 1.0, fract(t * 14.0)) * 0.14;
        float l = 0.8 + 0.2 * max(dot(n, normalize(vec3(0.3, 0.9, 0.4))), 0.0);
        col = col * l + iso + vec3(0.2, 0.9, 0.85) * twinSel(vW) * 0.25;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function holoMaterial(heat: Heat) {
  return new THREE.ShaderMaterial({
    uniforms: { uHot: heat.uHot, uHotCount: heat.uHotCount, uTime: heat.uTime, uSel: heat.uSel, uScan: heat.uScan },
    vertexShader: COMMON_VERT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      varying vec3 vN;
      ${HEAT_GLSL}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - abs(dot(n, v)), 2.4);
        float lines = smoothstep(0.82, 1.0, 0.5 + 0.5 * sin(vW.y * 150.0 - uTime * 3.0)) * 0.18;
        float grid = smoothstep(0.96, 1.0, abs(sin(vW.x * 40.0))) * 0.05;
        float h = twinHeat(vW);
        float s = twinSel(vW);
        vec3 base = vec3(0.24, 0.92, 0.82);
        vec3 col = mix(base, vec3(1.0, 0.32, 0.12), h);
        col = mix(col, vec3(0.6, 1.0, 0.95), s * 0.5);
        float a = fres * 0.9 + 0.035 + lines + grid + h * 0.35 + s * 0.12;
        gl_FragColor = vec4(col * (0.45 + fres * 1.3), a);
      }
    `,
  });
}

export type MatKey =
  | "coat"
  | "face"
  | "leg"
  | "horn"
  | "hoof"
  | "muzzle"
  | "nostril"
  | "eye"
  | "skin"
  | "tuft"
  | "comb"
  | "beak"
  | "feather"
  | "featherDark"
  | "shank"
  | "bone"
  | "organ"
  | "lung"
  | "heart";

export type MaterialSet = Record<MatKey, THREE.Material>;

export function anatomyMaterials(species: string, breed: string, heat: Heat): MaterialSet {
  const coat = coatFor(species, breed);
  const seed = `${species}-${breed}`;
  const bump = hairBump(!!coat.wool);
  const fur = (map: THREE.Texture, rough = coat.roughness) =>
    inject(
      new THREE.MeshPhysicalMaterial({
        map,
        bumpMap: bump,
        bumpScale: coat.wool ? 2.2 : 0.9,
        roughness: rough,
        metalness: 0,
        sheen: coat.wool ? 0.35 : 0.8,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color(coat.sheen),
        clearcoat: species === "buffalo" ? 0.15 : 0,
        clearcoatRoughness: 0.6,
        side: THREE.DoubleSide,
      }),
      heat,
    );
  const glossy = (color: string, rough: number, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    inject(new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3, side: THREE.DoubleSide, ...extra }), heat);

  const feather = inject(
    new THREE.MeshPhysicalMaterial({
      map: coatTexture(coat, "body", `${seed}-f`),
      roughness: coat.roughness,
      sheen: 1,
      sheenColor: new THREE.Color(coat.sheen),
      sheenRoughness: 0.35,
      iridescence: coat.pattern === "iridescent" ? 0.9 : 0.15,
      iridescenceIOR: 1.6,
      side: THREE.DoubleSide,
    }),
    heat,
  );

  return {
    coat: fur(coatTexture(coat, "body", seed)),
    face: fur(coatTexture(coat, "head", seed)),
    leg: fur(coatTexture({ ...coat, wool: false }, "leg", seed), Math.min(0.8, coat.roughness)),
    horn: inject(new THREE.MeshPhysicalMaterial({ map: hornTexture(coat.horn), roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.35 }), heat),
    hoof: glossy(coat.hoof, 0.32),
    muzzle: glossy(coat.muzzle, 0.42, { clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    nostril: new THREE.MeshStandardMaterial({ color: "#0a0706", roughness: 0.9 }),
    eye: new THREE.MeshPhysicalMaterial({ color: "#0d0907", roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.45 }),
    skin: inject(new THREE.MeshPhysicalMaterial({ color: coat.skin, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color("#ffe6dd") }), heat),
    tuft: fur(coatTexture({ ...coat, base: coat.tuft, shade: coat.tuft, belly: coat.tuft, pattern: "solid" }, "leg", `${seed}-tuft`), 0.95),
    comb: glossy(coat.comb || "#c4221c", 0.45, { sheen: 0.6, sheenColor: new THREE.Color("#ff9d8a") }),
    beak: glossy(coat.beak || "#d8a33a", 0.35),
    feather,
    featherDark: inject(
      new THREE.MeshPhysicalMaterial({
        color: coat.tail || coat.shade,
        roughness: 0.4,
        sheen: 1,
        sheenColor: new THREE.Color("#63d9c8"),
        iridescence: 0.8,
        side: THREE.DoubleSide,
      }),
      heat,
    ),
    shank: glossy(coat.shank || "#d9a53a", 0.5),
    bone: inject(new THREE.MeshPhysicalMaterial({ color: "#eaf7f2", roughness: 0.45, emissive: new THREE.Color("#3fbfad"), emissiveIntensity: 0.18, clearcoat: 0.4 }), heat, 1.3),
    organ: inject(new THREE.MeshPhysicalMaterial({ color: "#c98a7c", roughness: 0.35, transparent: true, opacity: 0.8, emissive: new THREE.Color("#5a1f1a"), emissiveIntensity: 0.25, clearcoat: 1 }), heat, 1.4),
    lung: inject(new THREE.MeshPhysicalMaterial({ color: "#e7a3a0", roughness: 0.5, transparent: true, opacity: 0.72, emissive: new THREE.Color("#7a2a33"), emissiveIntensity: 0.2 }), heat, 1.4),
    heart: inject(new THREE.MeshPhysicalMaterial({ color: "#b8313a", roughness: 0.3, emissive: new THREE.Color("#7a0f18"), emissiveIntensity: 0.5, clearcoat: 1 }), heat, 1.4),
  };
}
