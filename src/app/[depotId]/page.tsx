import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function DepotHomePage({
  params,
}: {
  params: Promise<{ depotId: string }>;
}) {
  const session = await auth();

  const { depotId } = await params;

  if (!session?.user) {
    redirect("/sandbox");
  }

  const userId = session.user.id;

  const depot = await db.depot.findUnique({
    where: {
      ownerId: userId,
      id: depotId,
    },
  });

  if (depot) {
    redirect(`/${depot.id}/overview`);
  }

  redirect(`/`);
}
