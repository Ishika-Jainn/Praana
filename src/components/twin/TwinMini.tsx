"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { TwinMode } from "./LivestockModel";

const TwinStage = dynamic(() => import("./TwinStage"), { ssr: false, loading: () => <div className="twin-loading"><span />Loading twin…</div> });

export default function TwinMini({ species, breed, sex, affected, label, height = 360 }: { species: string; breed: string; sex: string; affected: string[]; label: string; height?: number }) {
  const [mode, setMode] = useState<TwinMode>("anatomy");
  return (
    <div className="twin-hud compact" style={{ height }}>
      <div className="twin-canvas">
        <TwinStage variant="compact" species={species} breed={breed} sex={sex} affected={affected} mode={mode} />
      </div>
      <div className="hud-top">
        <div className="hud-id"><span className="live-dot" /><div><small>LINKED DIGITAL TWIN</small><b>{label}</b></div></div>
        <div className="hud-seg">
          {(["anatomy", "thermal", "xray"] as TwinMode[]).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m === "xray" ? "X-ray" : m[0].toUpperCase() + m.slice(1)}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
