import { redirect } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import { getSnapshot, visibleAlerts, visibleAnimals } from "@/lib/data";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const snapshot = await getSnapshot();
  const animals = user.role === "government" || user.role === "lab" ? snapshot.animals : visibleAnimals(user, snapshot.animals);
  return (
    <AppShell user={user} alerts={visibleAlerts(user, snapshot)} animals={animals}>
      {children}
    </AppShell>
  );
}
