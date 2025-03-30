import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

import { PathwaysDepotOverviewClient } from "./_components/overview-client";

export default async function PathwaysDepotOverviewPage({
  params,
  searchParams,
}: {
  params: { depotId: string };
  searchParams: { date?: string; welcome?: string };
}) {
  const session = await auth();

  if (!session?.user) return redirect("/auth/signin?callbackUrl=/");

  if (session?.user?.role === "DRIVER") return redirect("/unauthorized");

  const depot = await db.depot.findUnique({
    where: { id: params.depotId, ownerId: session.user.id },
  });

  if (!depot) return redirect("/");

  // Ensure date parameter is present
  if (!searchParams.date) {
    const formattedDate = new Date().toDateString().replace(/\s/g, "+");
    const welcomeParam = searchParams.welcome
      ? `&welcome=${searchParams.welcome}`
      : "";
    return redirect(
      `/${params.depotId}/overview?date=${formattedDate}${welcomeParam}`,
    );
  }

  return <PathwaysDepotOverviewClient />;
}
