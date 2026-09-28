import { TrendArea } from "@/components/charts";
import { getSnapshot } from "@/lib/data";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  await requireRole(["government","vet","field"]);
  const snap = await getSnapshot();
  const latest = snap.villages.map((v) => {
    const rows = snap.weather.filter((w) => w.villageId === v.id).sort((a, b) => a.date.localeCompare(b.date));
    return { village: v, now: rows.at(-1), rows };
  });
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Climate context</p>
          <h1>Weather beside the clinical picture.</h1>
          <p className="muted">Temperature, humidity and rainfall are supporting factors for risk. They never confirm a disease.</p>
        </div>
      </div>
      <div className="grid-3">
        {latest.map(({ village, now }) => (
          <article key={village.id} className="panel panel-pad">
            <p className="kicker">{village.name}</p>
            <h2>{now?.tempC}°C</h2>
            <p>Humidity {now?.humidity}% · rain {now?.rainfallMm} mm</p>
            <p className="muted">{now?.note}</p>
          </article>
        ))}
      </div>
      <section className="panel panel-pad" style={{ marginTop: 14 }}>
        <h3>Kalevadi humidity, last 10 days</h3>
        <TrendArea data={latest.find((l) => l.village.id === "v-kalevadi")?.rows.map((w) => ({ month: w.date.slice(5, 10), cases: w.humidity })) || []} />
        <p className="disclaimer">The chart reuses the trend view to show humidity, not case counts.</p>
      </section>
    </div>
  );
}
