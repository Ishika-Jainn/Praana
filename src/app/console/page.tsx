import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ConsoleIndex() {
  const user = await getSessionUser();
  if (!user) redirect("/enter");
  const dest =
    user.role === "farmer"
      ? "/console/farmer"
      : user.role === "field"
        ? "/console/field"
        : user.role === "vet"
          ? "/console/vet"
          : user.role === "lab"
            ? "/console/lab"
            : "/console/command";
  redirect(dest);
}
