import { notFound, redirect } from "next/navigation";
import TwinWorkspace from "@/components/twin/TwinWorkspace";
import { getAnimalDetail } from "@/lib/data";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/enter");

  const { id } = await params;
  const detail = await getAnimalDetail(decodeURIComponent(id));
  if (!detail) notFound();

  // Multi-tenancy check: farmers can only inspect animals in their own registered shed
  if (user.role === "farmer" && user.farmId && detail.animal.farmId !== user.farmId) {
    notFound();
  }

  return <TwinWorkspace detail={detail} />;
}
