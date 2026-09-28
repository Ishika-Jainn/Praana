"use client";

import { useOffline, useI18n } from "@/components/providers";
import { formatWhen } from "@/lib/format";

export default function SyncPage() {
  const offline = useOffline();
  const { t } = useI18n();
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">{t("sync.title")}</p>
          <h1>{offline.offline ? t("sync.on") : t("sync.off")}</h1>
          <p className="muted">{t("sync.help")}</p>
        </div>
      </div>
      <div className="grid-3">
        <button className="stat" onClick={offline.toggle}><div className="kicker">Mode</div><b>{offline.simulated ? "Simulated offline" : offline.online ? "Online" : "No network"}</b></button>
        <div className="stat"><div className="kicker">{t("common.pending")}</div><b>{offline.queue.length}</b></div>
        <div className="stat"><div className="kicker">{t("common.synced")}</div><b>{offline.lastSync ? formatWhen(offline.lastSync) : "—"}</b></div>
      </div>
      <section className="panel panel-pad" style={{ marginTop: 14 }}>
        {offline.queue.length === 0 && <p>No reports waiting. Turn offline mode on, file a report, then come back and sync.</p>}
        {offline.queue.map((item) => (
          <article key={item.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            <strong>{item.summary}</strong>
            <div className="faint">{item.kind} · {formatWhen(item.createdAt)} · sync pending</div>
          </article>
        ))}
        <button className="btn-primary" style={{ marginTop: 12 }} disabled={offline.syncing || offline.offline} onClick={() => offline.syncNow()}>
          {offline.syncing ? "Syncing…" : t("sync.now")}
        </button>
      </section>
    </div>
  );
}
