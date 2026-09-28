import { listUsers } from "@/lib/data";
import EnterDesk from "@/components/enter-desk";

export const dynamic = "force-dynamic";

export default async function EnterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const users = await listUsers();
  const { role } = await searchParams;
  return <EnterDesk users={users} initialRole={role} />;
}
