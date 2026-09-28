"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { regionsFor } from "@/lib/species";
import { anatomyMaterials, holoMaterial, MAX_HOT, thermalMaterial, type Heat, type MatKey } from "./materials";
import { getRig, nearestRegion, type Part, type V3Like } from "./rigtypes";

export type TwinMode = "anatomy" | "thermal" | "xray";

function Pivot({ pivot, innerRef, children }: { pivot: V3Like; innerRef?: React.Ref<THREE.Group>; children: React.ReactNode }) {
  return (
    <group position={pivot}>
      <group ref={innerRef}>
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>{children}</group>
      </group>
    </group>
  );
}

function MarkerRing({ position, delay }: { position: V3Like; delay: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const k = ((clock.elapsedTime * 0.8 + delay) % 1 + 1) % 1;
    if (ref.current) ref.current.scale.setScalar(0.6 + k * 1.6);
    if (mat.current) mat.current.opacity = 0.85 * (1 - k);
  });
  return (
    <Billboard position={position}>
      <mesh ref={ref} renderOrder={20}>
        <ringGeometry args={[0.045, 0.058, 48]} />
        <meshBasicMaterial ref={mat} color="#ff7a45" transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh renderOrder={21}>
        <circleGeometry args={[0.018, 24]} />
        <meshBasicMaterial color="#ffd2b8" depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

export default function LivestockModel({
  species,
  breed,
  sex,
  affected,
  selected,
  hovered,
  onSelect,
  onHover,
  mode,
  heat,
  markers = true,
  labels,
  still = false,
}: {
  species: string;
  breed: string;
  sex: string;
  affected: string[];
  selected: string | null;
  hovered: string | null;
  onSelect?: (region: string) => void;
  onHover?: (region: string | null) => void;
  mode: TwinMode;
  heat: Heat;
  markers?: boolean;
  labels?: Record<string, string>;
  still?: boolean;
}) {
  const rig = useMemo(() => getRig(species, breed, sex), [species, breed, sex]);
  const allowed = useMemo(() => regionsFor(species, sex), [species, sex]);
  const mats = useMemo(() => anatomyMaterials(species, breed, heat), [species, breed, heat]);
  const thermal = useMemo(() => thermalMaterial(heat), [heat]);
  const holo = useMemo(() => holoMaterial(heat), [heat]);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const earRefs = useRef<(THREE.Group | null)[]>([]);
  const hoverRef = useRef<string | null>(null);

  useEffect(() => () => {
    Object.values(mats).forEach((m) => m.dispose());
  }, [mats]);

  useEffect(() => {
    let n = 0;
    for (const r of affected) {
      for (const p of rig.anchors[r] || []) {
        if (n >= MAX_HOT) break;
        heat.uHot.value[n].set(p[0], p[1], p[2], rig.radii[r] ?? 0.3);
        n++;
      }
    }
    heat.uHotCount.value = n;
    heat.uHeight.value = rig.height;
  }, [affected, rig, heat]);

  useEffect(() => {
    const r = hovered || selected;
    const p = r ? rig.anchors[r]?.[0] : null;
    if (r && p) heat.uSel.value.set(p[0], p[1], p[2], (rig.radii[r] ?? 0.3) * 1.15);
    else heat.uSel.value.w = 0;
  }, [hovered, selected, rig, heat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    heat.uTime.value = t;
    if (still) return;
    if (bodyRef.current) {
      const b = Math.sin(t * rig.breathRate) * 0.011;
      bodyRef.current.scale.set(1, 1 + b, 1 + b * 0.9);
    }
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(t * 0.5) * 0.03 + (rig.kind === "bird" ? Math.sin(t * 2.4) * 0.035 : 0);
      headRef.current.rotation.y = Math.sin(t * 0.31) * 0.06;
    }
    if (tailRef.current) tailRef.current.rotation.x = Math.sin(t * 1.25) * (rig.kind === "bird" ? 0.03 : 0.14);
    earRefs.current.forEach((g, i) => {
      if (!g) return;
      const flick = Math.max(0, Math.sin(t * 0.7 + i * 2.1)) ** 30 * 0.35;
      g.rotation.x = (i % 2 ? -1 : 1) * (Math.sin(t * 0.9 + i) * 0.04 + flick);
    });
  });

  const materialFor = (part: Part) => {
    if (part.xray) return mats[part.mat];
    if (mode === "thermal") return thermal;
    if (mode === "xray") return holo;
    return mats[part.mat as MatKey];
  };

  const render = (parts: Part[]) =>
    parts
      .filter((p) => !p.xray || mode === "xray")
      .map((p, i) => <mesh key={i} geometry={p.geo} material={materialFor(p)} position={p.pos} rotation={p.rot} scale={p.scl} />);

  function pick(e: ThreeEvent<PointerEvent | MouseEvent>) {
    return nearestRegion(rig, e.point, allowed);
  }

  return (
    <group
      onPointerMove={(e) => {
        e.stopPropagation();
        const r = pick(e);
        if (r !== hoverRef.current) {
          hoverRef.current = r;
          onHover?.(r);
        }
        document.body.style.cursor = onSelect ? "pointer" : "default";
      }}
      onPointerOut={() => {
        hoverRef.current = null;
        onHover?.(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        if (e.delta > 5) return;
        e.stopPropagation();
        const r = pick(e);
        if (r) onSelect?.(r);
      }}
    >
      <Pivot pivot={rig.breathe} innerRef={bodyRef}>
        {render(rig.body)}
      </Pivot>
      {render(rig.limbs)}
      <Pivot pivot={rig.head.pivot} innerRef={headRef}>
        {render(rig.head.parts)}
        {rig.ears.map((ear, i) => (
          <Pivot key={i} pivot={ear.pivot} innerRef={(g) => { earRefs.current[i] = g; }}>
            {render(ear.parts)}
          </Pivot>
        ))}
      </Pivot>
      {rig.tail && (
        <Pivot pivot={rig.tail.pivot} innerRef={tailRef}>
          {render(rig.tail.parts)}
        </Pivot>
      )}
      {markers &&
        affected.map((region) => {
          const pts = rig.anchors[region];
          if (!pts?.length) return null;
          return (
            <group key={region}>
              {pts.slice(0, 4).map((p, i) => <MarkerRing key={i} position={p} delay={i * 0.23} />)}
              <Html position={pts[0]} zIndexRange={[30, 0]} style={{ pointerEvents: "auto" }}>
                <button className={`twin-tag ${selected === region ? "on" : ""}`} onClick={() => onSelect?.(region)}>
                  <i />
                  <span>{labels?.[region] || region}</span>
                </button>
              </Html>
            </group>
          );
        })}
    </group>
  );
}
