import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

import { PathwaysDepotOverviewClient } from "./_components/overview-client";

export default async function PathwaysDepotOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ depotId: string }>;
  searchParams: Promise<{ date?: string; welcome?: string }>;
}) {
  const session = await auth();

  const { depotId } = await params;
  const { date, welcome } = await searchParams;

  if (!session?.user) return redirect("/auth/signin?callbackUrl=/");

  if (session?.user?.role === "DRIVER") return redirect("/unauthorized");

  const depot = await db.depot.findUnique({
    where: { id: depotId, ownerId: session.user.id },
  });

  if (!depot) return redirect("/");

  // Ensure date parameter is present
  if (!date) {
    const formattedDate = new Date().toDateString().replace(/\s/g, "+");
    const welcomeParam = welcome ? `&welcome=${welcome}` : "";
    return redirect(
      `/${depotId}/overview?date=${formattedDate}${welcomeParam}`,
    );
  }

  return <PathwaysDepotOverviewClient />;
}
