import { FormAction } from "@/components/forms";
import { getSnapshot } from "@/lib/data";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { SPECIES_LIST, SPECIES_META } from "@/lib/species";

import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  await requireRole(["field", "farmer", "vet", "government"]);
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snap = await getSnapshot();
  const farmerFarm = user.farmId ? snap.farms.find((f) => f.id === user.farmId) : null;
  const farms = user.role === "farmer" && farmerFarm
    ? [farmerFarm]
    : user.blockId
      ? snap.farms.filter((f) => snap.villages.find((v) => v.id === f.villageId)?.blockId === user.blockId)
      : snap.farms;

  return (
    <div className="grid-2">
      <div>
        <p className="kicker">Livestock Registry</p>
        <h1 className="serif">Put a new animal on a digital twin.</h1>
        <p className="muted">Enter existing 12-digit Bharat Pashudhan (INAPH) ear tags or generate a new digital health identity. Written to the ledger and synchronized immediately.</p>
      </div>
      <FormAction type="register_animal" label="Register animal">
        <label className="field">Name<input name="name" required placeholder="Basanti" /></label>
        <label className="field">12-Digit Ear Tag / Bharat Pashudhan UID (optional)<input name="earTag" placeholder="e.g. 100028475921 (auto-generated if blank)" maxLength={16} /></label>
        {user.role === "farmer" && farmerFarm ? (
          <label className="field">Farm / Shed
            <input type="text" readOnly value={`${farmerFarm.name} (${farmerFarm.ownerName})`} style={{ background: "var(--surface-sunken)", opacity: 0.85 }} />
            <input type="hidden" name="farmId" value={farmerFarm.id} />
          </label>
        ) : (
          <label className="field">Farm / Shed
            <select name="farmId">{farms.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.ownerName})</option>)}</select>
          </label>
        )}
        <label className="field">Species
          <select name="species">
            {SPECIES_LIST.map((s) => <option key={s} value={s}>{SPECIES_META[s].label.en} · {SPECIES_META[s].group}</option>)}
          </select>
        </label>
        <label className="field">Breed
          <input name="breed" defaultValue="Gir" list="breed-list" />
          <datalist id="breed-list">
            {SPECIES_LIST.flatMap((s) => SPECIES_META[s].breeds.map((b) => <option key={`${s}-${b}`} value={b}>{SPECIES_META[s].label.en}</option>))}
          </datalist>
        </label>
        <label className="field">Sex
          <select name="sex"><option value="female">Female</option><option value="male">Male</option></select>
        </label>
        <label className="field">Age in months<input name="ageMonths" type="number" defaultValue={36} /></label>
        <label className="field">Weight kg<input name="weightKg" type="number" defaultValue={340} /></label>
        <label className="field">Milk yield litres / day<input name="milkYieldL" type="number" step="0.1" placeholder="e.g. 12.5" /></label>
      </FormAction>
    </div>
  );
}
