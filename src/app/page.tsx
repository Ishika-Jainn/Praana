import Link from "next/link";
import { getSnapshot } from "@/lib/data";
import { coverage } from "@/lib/data";
import HeroVisual from "@/components/landing/HeroVisual";

export const dynamic = "force-dynamic";

const PHOTOS = {
  gir: "https://images.pexels.com/photos/11767974/pexels-photo-11767974.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1400&w=1800",
  buffalo: "https://images.pexels.com/photos/13180841/pexels-photo-13180841.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1600",
  farmer: "https://images.pexels.com/photos/35545895/pexels-photo-35545895.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1100&w=1600",
  fields: "https://images.pexels.com/photos/11276073/pexels-photo-11276073.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  lab: "https://images.pexels.com/photos/9574397/pexels-photo-9574397.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  aerial: "https://images.pexels.com/photos/15052648/pexels-photo-15052648.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600",
  milk: "https://images.pexels.com/photos/32543710/pexels-photo-32543710.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
};

export default async function HomePage() {
  let monitored = 32;
  let suspected = 7;
  let confirmed = 1;
  let cover = 78;
  try {
    const snap = await getSnapshot();
    monitored = snap.animals.length;
    suspected = snap.animals.filter((a) => a.status === "suspected").length;
    confirmed = snap.animals.filter((a) => a.status === "confirmed").length;
    cover = Math.round(coverage(snap.animals, snap.vaccinations) * 100);
  } catch {
    /* landing still renders if the database is briefly unavailable */
  }

  return (
    <div>
      <header className="lp">
        <nav className="lp-nav">
          <Link href="/" className="brand" style={{ color: "white" }}>
            <span className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M6 22c2-7 5-10 10-10s8 3 10 10" stroke="#10241f" strokeWidth="1.8" strokeLinecap="round"/><circle cx="16" cy="12" r="1.7" fill="#10241f"/></svg>
            </span>
            <span><b>Praana</b><small>Livestock intelligence</small></span>
          </Link>
          <div>
            <a href="#problem">Problem</a>
            <a href="#twin">Digital twin</a>
            <a href="#map">Surveillance</a>
            <a href="#roles">Desks</a>
            <Link href="/enter" className="btn-copper" style={{ marginLeft: 16 }}>Enter the network</Link>
          </div>
        </nav>
        <section className="lp-hero">
          <div>
            <p className="kicker" style={{ color: "#e6c27c" }}>Satara–Sangli livestock network</p>
            <h1>From one animal to an entire disease network.</h1>
            <p className="sub">AI-assisted livestock health surveillance powered by digital twins, real-time reporting and geospatial disease intelligence.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
              <Link href="/enter?role=government" className="btn-copper">Open command center</Link>
              <Link href="/enter?role=farmer" className="btn-line" style={{ color: "white", borderColor: "rgba(255,255,255,.2)" }}>Enter as livestock owner</Link>
            </div>
            <div className="grid-4" style={{ marginTop: 28 }}>
              {[
                [monitored, "Animals on twins"],
                [suspected, "Suspected now"],
                [confirmed, "Lab confirmed"],
                [`${cover}%`, "FMD cover"],
              ].map(([n, l]) => (
                <div key={String(l)}>
                  <b className="serif" style={{ fontSize: "1.8rem" }}>{n}</b>
                  <div style={{ color: "rgba(246,241,231,.65)", fontSize: 13 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <HeroVisual />
        </section>
      </header>

      <section className="lp-light" id="problem">
        <div className="lp-section problem-grid">
          <div>
            <p className="kicker">The problem</p>
            <h2 className="serif" style={{ fontSize: "clamp(2rem,4vw,3.4rem)", margin: "8px 0", letterSpacing: "-0.04em" }}>Health slips live in sheds, notebooks and late phone calls.</h2>
            <p className="muted">Owners see one animal. Veterinarians see a queue. The district sees a spreadsheet after the cluster has already moved. Praana keeps the same record moving upward — from a mouth lesion to a village hotspot — without asking a farmer to learn a command center.</p>
            <div className="grid-3" style={{ marginTop: 18 }}>
              {[
                ["Fragmented history", "Vaccination, treatment and last season’s fever never sit in one place."],
                ["Slow signals", "Salivation in three sheds is still three phone calls, not a cluster."],
                ["Late containment", "By the time a map is drawn, animals have already gone to market."],
              ].map(([t, d]) => (
                <article key={t} className="panel panel-pad">
                  <h3>{t}</h3>
                  <p className="muted">{d}</p>
                </article>
              ))}
            </div>
          </div>
          <img className="shot" src={PHOTOS.farmer} alt="Livestock owner with cattle in a rural courtyard" />
        </div>
      </section>

      <section className="lp-light" style={{ paddingBottom: 20 }}>
        <div className="lp-section" style={{ paddingTop: 0 }}>
          <p className="kicker">How it works</p>
          <h2 className="serif" style={{ fontSize: "clamp(2rem,4vw,3rem)", marginTop: 8 }}>Animal → twin → triage → clinic → laboratory → herd → map → action</h2>
          <div className="flow-line" style={{ marginTop: 18 }}>
            {["Livestock owner", "Animal", "Digital twin", "Symptoms + images", "Rule-based triage", "Veterinary exam", "Laboratory", "Herd surveillance", "Risk map", "Command center", "Containment"].map((step, i) => (
              <span key={step}>{i + 1 < 10 ? `0${i + 1}` : i + 1} {step}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-deep" id="twin">
        <div className="lp-section problem-grid">
          <div>
            <p className="kicker">Digital twin</p>
            <h2 className="serif" style={{ fontSize: "clamp(2rem,4vw,3.4rem)", color: "white", margin: "8px 0" }}>Not a picture of a cow. A living health identity.</h2>
            <p style={{ color: "rgba(246,241,231,.75)" }}>Every registered animal carries a twin that remembers examinations, photographs, vaccines, samples and risk. When a hoof is involved, the hoof is marked. When a laboratory result returns, the twin changes status — healthy, observation, suspected, confirmed, recovering, deceased.</p>
            <div className="grid-2" style={{ marginTop: 16 }}>
              {["Rotate, zoom and inspect ten body regions", "Click a marker to open the evidence", "Compare yesterday’s mouth plate with today’s", "See the same animal inside the village cluster"].map((item) => (
                <div key={item} style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10 }}>{item}</div>
              ))}
            </div>
          </div>
          <img className="shot" src={PHOTOS.gir} alt="Gir cattle portrait" />
        </div>
      </section>

      <section className="lp-light" id="map">
        <div className="lp-section">
          <p className="kicker">Disease surveillance</p>
          <h2 className="serif" style={{ fontSize: "clamp(2rem,4vw,3.2rem)", margin: "8px 0" }}>District, block, village, farm, herd, animal.</h2>
          <div className="problem-grid">
            <img className="shot" src={PHOTOS.aerial} alt="Aerial farmland" />
            <div className="grid-2">
              {[
                ["Risk map", "Suspected, confirmed, mortality, coverage, veterinary centres and laboratories on one operational map."],
                ["Cluster detection", "Eight FMD-pattern cases across three farms inside five kilometres is a signal, not a coincidence."],
                ["Weather context", "Humidity and rainfall sit beside the clinical picture. They support risk. They do not diagnose."],
                ["Containment rail", "Detection, verification, sampling, confirmation, isolation, nearby surveillance, prevention, recovery."],
              ].map(([t, d]) => (
                <article key={t} className="panel panel-pad">
                  <h3>{t}</h3>
                  <p className="muted">{d}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-light" id="roles">
        <div className="lp-section" style={{ paddingTop: 10 }}>
          <p className="kicker">Five desks, one record</p>
          <div className="role-grid">
            {[
              ["Livestock owner", "Large actions. My animals, report, vaccines, treatments, alerts, call the veterinarian.", "/enter?role=farmer", PHOTOS.milk],
              ["Field worker", "Assigned villages, camera, GPS, offline queue, registration and referral.", "/enter?role=field", PHOTOS.fields],
              ["Veterinarian", "High-risk queue, examinations, samples, treatments and follow-ups.", "/enter?role=vet", PHOTOS.gir],
              ["Laboratory", "Collected, in transit, received, testing, result. The twin updates itself.", "/enter?role=lab", PHOTOS.lab],
              ["Command center", "What is happening, where, how serious, and what action is waiting.", "/enter?role=government", PHOTOS.aerial],
              ["Offline belt", "English, Hindi and Marathi. Voice reporting. Sync when the tower returns.", "/enter?role=field", PHOTOS.buffalo],
            ].map(([title, copy, href, img]) => (
              <Link key={title} href={href} className="panel" style={{ overflow: "hidden" }}>
                <img src={img} alt="" style={{ height: 140, width: "100%", objectFit: "cover" }} />
                <div className="panel-pad">
                  <h3>{title}</h3>
                  <p className="muted">{copy}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-deep">
        <div className="lp-section">
          <p className="kicker">Impact</p>
          <h2 className="serif" style={{ color: "white", fontSize: "clamp(2rem,4vw,3.2rem)" }}>See one animal. Understand the herd. Catch the belt before the market does.</h2>
          <div className="impact-grid" style={{ marginTop: 22 }}>
            {[
              ["Hours, not weeks", "A shed report becomes a case, a sample and a district alert in the same sitting."],
              ["Decision support", "The engine says possible, suspected, risk detected. It never pretends to diagnose."],
              ["A record that travels", "The owner, the veterinarian, the laboratory and the district read the same twin."],
            ].map(([t, d]) => (
              <article key={t}>
                <h3 className="serif" style={{ color: "white", fontSize: "1.6rem" }}>{t}</h3>
                <p style={{ color: "rgba(246,241,231,.72)" }}>{d}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/enter" className="btn-copper">Enter the Satara–Sangli demo</Link>
          </div>
        </div>
      </section>
      <footer className="lp-light">
        <div className="lp-section" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>Praana · livestock health intelligence · demonstration network</span>
          <span className="muted">Photographs via Pexels. Triage is not a diagnosis.</span>
        </div>
      </footer>
    </div>
  );
}
