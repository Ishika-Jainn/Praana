"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "./bits";
import { coverage } from "@/lib/metrics";
import type { Snapshot } from "@/lib/types";

type Node = { kind: string; id: string; label: string };

export default function TerritoryExplorer({ snap }: { snap: Snapshot }) {
  const [node, setNode] = useState<Node>({ kind: "district", id: "d-satara", label: "Satara" });
  const animals = useMemo(() => {
    if (node.kind === "district") return snap.animals.filter((a) => a.districtId === node.id);
    if (node.kind === "block") return snap.animals.filter((a) => a.blockId === node.id);
    if (node.kind === "village") return snap.animals.filter((a) => a.villageId === node.id);
    if (node.kind === "farm") return snap.animals.filter((a) => a.farmId === node.id);
    return snap.animals;
  }, [node, snap.animals]);
  const blocks = snap.blocks.filter((b) => node.kind !== "district" || b.districtId === node.id);
  const cover = Math.round(coverage(animals, snap.vaccinations) * 100);
  const suspected = animals.filter((a) => a.status === "suspected" || a.status === "confirmed").length;

  return (
    <div className="grid-2">
      <section className="panel panel-pad tree">
        <p className="kicker">Maharashtra</p>
        {snap.districts.map((d) => (
          <div key={d.id}>
            <button className={node.id === d.id ? "on" : ""} onClick={() => setNode({ kind: "district", id: d.id, label: d.name })}>{d.name}</button>
            {snap.blocks.filter((b) => b.districtId === d.id).map((b) => (
              <div key={b.id} style={{ paddingLeft: 12 }}>
                <button className={node.id === b.id ? "on" : ""} onClick={() => setNode({ kind: "block", id: b.id, label: b.name })}>{b.name}</button>
                {snap.villages.filter((v) => v.blockId === b.id).map((v) => (
                  <div key={v.id} style={{ paddingLeft: 12 }}>
                    <button className={node.id === v.id ? "on" : ""} onClick={() => setNode({ kind: "village", id: v.id, label: v.name })}>{v.name}</button>
                    {snap.farms.filter((f) => f.villageId === v.id).map((f) => (
                      <div key={f.id} style={{ paddingLeft: 12 }}>
                        <button className={node.id === f.id ? "on" : ""} onClick={() => setNode({ kind: "farm", id: f.id, label: f.name })}>{f.name}</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </section>
      <section>
        <div className="page-head">
          <div>
            <p className="kicker">{node.kind}</p>
            <h1>{node.label}</h1>
          </div>
        </div>
        <div className="grid-3">
          <div className="stat"><div className="kicker">Animals</div><b>{animals.length}</b></div>
          <div className="stat"><div className="kicker">Suspect / confirmed</div><b>{suspected}</b></div>
          <div className="stat"><div className="kicker">FMD cover</div><b>{cover}%</b></div>
        </div>
        {node.kind === "district" && (
          <div className="grid-3" style={{ marginTop: 12 }}>
            {blocks.map((b) => {
              const herd = snap.animals.filter((a) => a.blockId === b.id);
              const hot = herd.filter((a) => a.status === "suspected" || a.status === "confirmed").length;
              return (
                <button key={b.id} className="panel panel-pad" onClick={() => setNode({ kind: "block", id: b.id, label: b.name })}>
                  <strong>{b.name}</strong>
                  <p className="muted">{herd.length} twins · {hot} in the clinical net</p>
                </button>
              );
            })}
          </div>
        )}
        <div className="grid-2" style={{ marginTop: 12 }}>
          {animals.map((a) => (
            <Link key={a.id} href={`/console/animals/${a.id}`} className="panel panel-pad" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span><strong>{a.name}</strong><div className="faint">{a.farmName} · {a.villageName}</div></span>
              <StatusPill status={a.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
