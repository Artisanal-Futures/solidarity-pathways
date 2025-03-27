import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

import { PathwaysDepotOverviewClient } from "./_components/overview-client";

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

  await validateDate(params);

  return <PathwaysDepotOverviewClient />;
}

const validateDate = async (
  searchParams: Record<string, string | string[] | undefined>,
) => {
  const depotId = searchParams.depotId as string;
  const date = searchParams.date;
  const welcome = searchParams.welcome;

  if (!date) {
    const formattedDate = new Date().toDateString().replace(/\s/g, "+");
    const welcomeParam = welcome ? `&welcome=${welcome as string}` : "";
    const redirectUrl = `/tools/solidarity-pathways/${depotId}/overview?date=${formattedDate}${welcomeParam}`;

    return redirect(redirectUrl);
  }

  return null;
};
