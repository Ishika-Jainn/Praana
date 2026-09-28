"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnimalView, CaseView } from "@/lib/types";
import { useOffline } from "./providers";
import { StatusPill } from "./bits";

export function ForwardCase({ c, animal }: { c: CaseView; animal?: AnimalView }) {
  const router = useRouter();
  const offline = useOffline();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const targetVetName = c.assignedVetName || "Dr. Ananya Kulkarni";
  const targetVetId = c.assignedVetId || "u-ananya";
  const forwarded = !["reported", "triaged"].includes(c.status);
  async function send() {
    const payload = { caseId: c.id, note, vetId: targetVetId, vetName: targetVetName };
    if (offline.offline) {
      offline.enqueue({ kind: "forward_case", summary: `Forward ${c.caseCode}`, payload });
      setMsg("Queued — will forward when you're back online.");
      setOpen(false);
      return;
    }
    const res = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "forward_case", payload }) });
    const data = await res.json();
    setMsg(res.ok ? data.message : data.error);
    setOpen(false);
    router.refresh();
  }
  return (
    <article className="field-case">
      <div className="track-head">
        <div>
          <b>{animal?.name}</b> <span className="faint">· {c.caseCode}</span>
          <p>{animal?.farmName}, {animal?.villageName} · possible {c.suspected}</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <StatusPill status={c.riskLevel} kind="risk" />
          <StatusPill status={c.status} kind="case" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <Link className="btn-line" href={`/console/animals/${c.animalId}`}>Digital twin</Link>
        <Link className="btn-line" href={`/console/report?animal=${c.animalId}`}>Add observation</Link>
        {forwarded ? (
          <span className="pill tone-recovering"><i />With {c.assignedVetName || "Veterinarian"}</span>
        ) : (
          <button className="btn-copper" onClick={() => setOpen((v) => !v)}>Forward to veterinarian</button>
        )}
      </div>
      {open && (
        <div className="forward-box">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Field observation for the vet (temperature, in-contacts, what the owner said)…" />
          <button className="btn-primary" onClick={send}>Send to {targetVetName}</button>
        </div>
      )}
      {msg && <p className="faint" style={{ margin: "8px 0 0" }}>{msg}</p>}
    </article>
  );
}

export function SyncCard() {
  const offline = useOffline();
  return (
    <div className={`sync-card ${offline.offline ? "off" : ""}`}>
      <div>
        <small>CONNECTIVITY</small>
        <b>{offline.offline ? "Offline — saving on device" : "Online"}</b>
        <span>{offline.queue.length} item{offline.queue.length === 1 ? "" : "s"} waiting to sync</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-line" onClick={offline.toggle}>{offline.simulated ? "Go online" : "Simulate offline"}</button>
        <button className="btn-primary" disabled={offline.offline || !offline.queue.length || offline.syncing} onClick={() => offline.syncNow()}>
          {offline.syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>
    </div>
  );
}
