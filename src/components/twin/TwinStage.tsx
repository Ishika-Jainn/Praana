"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import LivestockModel, { type TwinMode } from "./LivestockModel";
import { createHeat, type Heat } from "./materials";
import { getRig, type Rig } from "./rig";

export type { TwinMode };

const DIRS: Record<string, [number, number, number]> = {
  threeq: [-0.62, 0.24, 0.76],
  side: [0.02, 0.12, 1],
  front: [-1, 0.14, 0.12],
  rear: [1, 0.2, 0.25],
  top: [0.05, 1, 0.18],
};

function cameraFor(rig: Rig, view: string, focus: string | null, variant: string) {
  const center = new THREE.Vector3(...rig.center);
  const regionView = focus || (view === "head" ? "head" : view === "hooves" ? "hooves" : null);
  if (regionView && rig.anchors[regionView]?.[0]) {
    const a = new THREE.Vector3(...rig.anchors[regionView][0]);
    const out = a.clone().sub(center);
    out.y *= 0.35;
    if (out.length() < 0.05) out.set(0, 0, 1);
    out.normalize();
    const dir = out.multiplyScalar(0.6).add(new THREE.Vector3(regionView === "head" || regionView === "mouth" ? -0.4 : 0.1, 0.22, 0.8)).normalize();
    return { pos: a.clone().add(dir.multiplyScalar(rig.height * 0.75 + 0.55)), target: a };
  }
  const d = DIRS[view] || DIRS.threeq;
  const dist = rig.height * 2.25 + (variant === "compact" ? 1.8 : 2.1);
  // frame the whole animal (including hooves) slightly above the bottom HUD
  const target = new THREE.Vector3(center.x, rig.height * 0.42, center.z);
  if (view === "top") target.y = rig.height * 0.35;
  return { pos: target.clone().add(new THREE.Vector3(...d).normalize().multiplyScalar(dist)), target };
}

function CameraRig({ rig, view, focus, variant }: { rig: Rig; view: string; focus: string | null; variant: string }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const anim = useRef<{ fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; start: number } | null>(null);
  useEffect(() => {
    const { pos, target } = cameraFor(rig, view, focus, variant);
    anim.current = {
      fromP: camera.position.clone(),
      toP: pos,
      fromT: controls?.target.clone() ?? new THREE.Vector3(...rig.center),
      toT: target,
      start: performance.now(),
    };
  }, [rig, view, focus, variant, camera, controls]);
  useFrame(() => {
    const a = anim.current;
    if (!a || !controls) return;
    const k = Math.min(1, (performance.now() - a.start) / 1000);
    const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
    camera.position.lerpVectors(a.fromP, a.toP, e);
    controls.target.lerpVectors(a.fromT, a.toT, e);
    controls.update();
    if (k >= 1) anim.current = null;
  });
  return null;
}

const platformVert = /* glsl */ `
varying vec2 vP;
void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const platformFrag = /* glsl */ `
varying vec2 vP;
uniform float uTime;
uniform vec3 uTint;
void main() {
  float r = length(vP) / 2.6;
  float ang = atan(vP.y, vP.x);
  vec3 col = mix(vec3(0.05, 0.13, 0.11), vec3(0.015, 0.04, 0.035), smoothstep(0.0, 1.0, r));
  float rings = smoothstep(0.012, 0.0, abs(fract(r * 9.0) - 0.5) - 0.485) * 0.18 * (1.0 - r);
  float spokes = smoothstep(0.03, 0.0, abs(fract(ang / 6.2831 * 48.0) - 0.5) - 0.47) * 0.06 * smoothstep(0.35, 0.8, r) * (1.0 - r);
  float rim = smoothstep(0.012, 0.0, abs(r - 0.86)) * 0.9;
  float ticks = step(0.5, fract(ang / 6.2831 * 120.0 + uTime * 0.02)) * smoothstep(0.02, 0.0, abs(r - 0.9)) * 0.45;
  float sweep = pow(max(0.0, cos(ang - uTime * 0.6)), 24.0) * smoothstep(0.86, 0.2, r) * 0.18;
  col += uTint * (rings + spokes + rim + ticks + sweep);
  float alpha = (1.0 - smoothstep(0.88, 1.0, r)) * 0.96;
  gl_FragColor = vec4(col, alpha);
}
`;

function Platform({ tint }: { tint: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Color(tint) } },
        vertexShader: platformVert,
        fragmentShader: platformFrag,
        transparent: true,
        depthWrite: false,
      }),
    [tint],
  );
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} material={mat} renderOrder={-1}>
      <circleGeometry args={[2.6, 96]} />
    </mesh>
  );
}

function Scanner({ heat, rig, active }: { heat: Heat; rig: Rig; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const y = ((clock.elapsedTime * 0.42) % 1.15) * (rig.height + 0.1);
    heat.uScan.value.set(y, active ? 0.9 : 0, active ? 1 : 0);
    if (ref.current) {
      ref.current.visible = active;
      ref.current.position.y = y;
    }
  });
  return (
    <group ref={ref}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.75, 64]} />
        <meshBasicMaterial color="#5ff2d6" transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.72, 1.75, 96]} />
        <meshBasicMaterial color="#7ffbe3" transparent opacity={0.65} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function TwinStage({
  species,
  breed,
  sex,
  affected,
  selected = null,
  hovered = null,
  onSelect,
  onHover,
  mode = "anatomy",
  view = "threeq",
  focus = null,
  scan = false,
  autoRotate = false,
  markers = true,
  labels,
  variant = "clinical",
  fever = 0,
  still = false,
}: {
  species: string;
  breed: string;
  sex: string;
  affected: string[];
  selected?: string | null;
  hovered?: string | null;
  onSelect?: (region: string) => void;
  onHover?: (region: string | null) => void;
  mode?: TwinMode;
  view?: string;
  focus?: string | null;
  scan?: boolean;
  autoRotate?: boolean;
  markers?: boolean;
  labels?: Record<string, string>;
  variant?: "clinical" | "hero" | "compact";
  fever?: number;
  still?: boolean;
}) {
  const heat = useMemo(() => createHeat(), []);
  const rig = getRig(species, breed, sex);
  heat.uFever.value = fever;
  const initial = cameraFor(rig, view, focus, variant);
  const hero = variant === "hero";

  return (
    <Canvas
      camera={{ position: initial.pos.toArray() as [number, number, number], fov: 30, near: 0.05, far: 60 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000", 0);
        gl.toneMappingExposure = 1.08;
      }}
      onPointerMissed={() => onHover?.(null)}
    >
      <ambientLight intensity={0.22} />
      <hemisphereLight args={["#f3efe6", "#0c2a23", 0.45]} />
      <directionalLight position={[3.5, 6, 4.5]} intensity={2.3} color="#fff1e0" />
      <directionalLight position={[-4.5, 3.5, -4]} intensity={2.6} color="#86e6d5" />
      <directionalLight position={[-3, 1.2, 4]} intensity={0.55} color="#ffd9b0" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 5, 1]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffe2c4" position={[-5, 2, 3]} rotation-y={Math.PI / 2.5} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#9fe9dc" position={[5, 2, -3]} rotation-y={-Math.PI / 2.5} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={0.9} color="#ffffff" position={[0, 1.5, -6]} scale={3} />
      </Environment>

      <LivestockModel
        species={species}
        breed={breed}
        sex={sex}
        affected={affected}
        selected={selected}
        hovered={hovered}
        onSelect={onSelect}
        onHover={onHover}
        mode={mode}
        heat={heat}
        markers={markers}
        labels={labels}
        still={still}
      />

      <Platform tint={mode === "thermal" ? "#ff8a3d" : "#5fe8d0"} />
      {mode === "anatomy" && <ContactShadows position={[0, 0.001, 0]} opacity={0.62} scale={6} blur={2.4} far={2.6} resolution={512} color="#000000" />}
      <Scanner heat={heat} rig={rig} active={scan} />
      <Sparkles count={hero ? 50 : 34} scale={[5, rig.height * 1.4, 5]} position={[0, rig.height * 0.6, 0]} size={1.6} speed={0.25} opacity={0.35} color={mode === "thermal" ? "#ffb070" : "#7fe8d6"} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={!hero}
        enableZoom={!hero}
        autoRotate={autoRotate}
        autoRotateSpeed={hero ? 0.9 : 0.6}
        minDistance={0.8}
        maxDistance={12}
        maxPolarAngle={Math.PI / 1.95}
        target={initial.target.toArray() as [number, number, number]}
      />
      <CameraRig rig={rig} view={view} focus={focus} variant={variant} />
    </Canvas>
  );
}
