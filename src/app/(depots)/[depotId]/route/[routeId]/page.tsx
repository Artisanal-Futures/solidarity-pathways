import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

import { RouteClient } from "./_components/route-client";

export default async function PathwaysDepotOverviewPage({
  params,
}: {
  params: { depotId: string };
}) {
  const session = await auth();

  if (!session) return redirect("/sandbox");

  if (session?.user?.role === "DRIVER") return redirect("/unauthorized");

  //TODO: Redirect to sign in
  if (!session?.user) return redirect("/sandbox");

  const depot = await db.depot.findUnique({
    where: { id: params.depotId },
  });

  if (!depot) return redirect("/");

  const isOwner = session.user.id === depot.ownerId;

  if (!isOwner) return redirect("/unauthorized");

  return <RouteClient />;
}
