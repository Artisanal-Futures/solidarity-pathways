import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function DepotHomePage(props: { params: { depotId: string } }) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/tools/solidarity-pathways/sandbox");
  }

  const userId = session.user.id;

  const depot = await db.depot.findUnique({
    where: {
      ownerId: userId,
      id: props.params?.depotId,
    },
  });

  if (depot)
    redirect(`/tools/solidarity-pathways/${depot.id.toString()}/overview`);

  redirect(`/tools/solidarity-pathways/`);
}
