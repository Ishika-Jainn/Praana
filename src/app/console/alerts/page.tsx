import Link from "next/link";
import { StatusPill } from "@/components/bits";
import { SubmitAction } from "@/components/forms";
import { getSnapshot, visibleAlerts } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { formatWhen } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();
  const alerts = visibleAlerts(user, snap);
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Notification centre</p>
          <h1>What happened, where, and what to do.</h1>
        </div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {alerts.map((a) => (
          <article key={a.id} className="panel panel-pad">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <p className="kicker">{a.type.replaceAll("_", " ")}</p>
              <StatusPill status={a.riskLevel} kind="risk" />
            </div>
            <h2>{a.title}</h2>
            <div className="grid-2">
              <div><span className="faint">What happened</span><p>{a.body}</p></div>
              <div>
                <span className="faint">Where</span><p>{a.location || "Network"}</p>
                <span className="faint">Recommended action</span><p>{a.action}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="faint">{formatWhen(a.createdAt)}</span>
              {a.animalId && <Link className="btn-line" href={`/console/animals/${a.animalId}`}>Open twin</Link>}
              {a.caseId && <Link className="btn-line" href={`/console/cases/${a.caseId}`}>Case</Link>}
              {!a.readBy.includes(user.id) && <SubmitAction type="mark_alert_read" payload={{ alertId: a.id, userId: user.id }} className="btn-primary">Acknowledge</SubmitAction>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
