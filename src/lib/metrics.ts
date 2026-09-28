import type { AnimalView, VaccinationView } from "./types";

const ELIGIBLE: Record<string, string[]> = {
  FMD: ["cattle", "buffalo", "goat", "sheep", "pig"],
};

export function coverage(animalsIn: AnimalView[], vax: VaccinationView[], vaccine = "FMD") {
  const eligible = ELIGIBLE[vaccine];
  const living = animalsIn.filter((a) => a.status !== "deceased" && (!eligible || eligible.includes(a.species)));
  if (!living.length) return 0;
  const windowDays = vaccine === "FMD" ? 180 : 365;
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * windowDays;
  const covered = new Set(
    vax.filter((v) => v.vaccine === vaccine && new Date(v.givenAt).getTime() >= cutoff).map((v) => v.animalId),
  );
  return covered.size / living.length;
}
