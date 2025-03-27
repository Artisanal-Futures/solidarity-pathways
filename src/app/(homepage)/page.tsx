import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { HomepageClient } from "./_components/homepage-client";

export default async function SolidarityPathwaysHomePage() {
  const session = await auth();
  const userId = session?.user.id;

  if (!session || !session.user) redirect("/sandbox");

  const depot = await db.depot.findFirst({
    where: { ownerId: userId },
  });

  if (depot) redirect(`/${depot.id.toString()}/overview`);

  return <HomepageClient />;
}
