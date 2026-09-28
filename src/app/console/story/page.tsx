import { requireRole } from "@/lib/session";
import Link from "next/link";

const STEPS = [
  ["Owner notices", "Gauri is drooling and short-strided at Patil Dairy.", "/console/animals/MH-SAT-00421"],
  ["Report", "Mouth and hoof are marked. Voice or checklist becomes a structured report.", "/console/report?animal=MH-SAT-00422"],
  ["Triage", "The rule engine says possible FMD, high risk. It does not diagnose.", "/console/animals/MH-SAT-00421"],
  ["Twin updates", "Mouth and hooves highlight. The timeline records the report.", "/console/animals/MH-SAT-00421"],
  ["Veterinarian", "Dr. Kulkarni examines, writes findings, and requests epithelium.", "/console/cases/c-gauri"],
  ["Laboratory", "SMP-2026-1184 is in testing. Post a result to confirm or reject.", "/console/lab"],
  ["Anchor case", "Radha is already laboratory positive, serotype O.", "/console/animals/MH-SAT-00430"],
  ["Cluster", "Eight animals, three farms, five kilometres.", "/console/herd"],
  ["Map", "The Kalevadi belt heats up. Sangli stays quiet.", "/console/map"],
  ["Command", "The district sees the hotspot and the open response queue.", "/console/command"],
];

export default async function StoryPage() {
  await requireRole(["government"]);
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="kicker">Demonstration</p>
          <h1>One cow, then the belt.</h1>
          <p className="muted">Walk the connected story, or file a fresh report on Lakshmi and watch a new case join the same network.</p>
        </div>
        <Link className="btn-copper" href="/console/report?animal=MH-SAT-00422">Report Lakshmi now</Link>
      </div>
      <div className="grid-2">
        {STEPS.map(([title, copy, href], i) => (
          <Link key={title} href={href} className="panel panel-pad">
            <p className="kicker">0{i + 1}</p>
            <h2>{title}</h2>
            <p className="muted">{copy}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
