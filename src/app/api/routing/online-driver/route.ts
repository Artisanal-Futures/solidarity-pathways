/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

import { pusherServer } from "~/lib/soketi/server";

export async function POST(request: Request) {
  const session = await auth();
  const cookies = request.headers.get("cookie");
  const token = cookies
    ?.split("; ")
    .find((c) => c.startsWith("verifiedDriver="))
    ?.split("=")[1];

  if (!token && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { vehicleId } = body;

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId },
    include: { driver: true },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Driver not found" }, { status: 200 });
  }

  const message = `${vehicle.driver?.name} is online`;

  // Create notification in database?

  // Trigger a Pusher event with the updated locations
  await pusherServer.trigger("map", `evt::notify-dispatch`, message);

  return NextResponse.json({ message: "Location updated" }, { status: 200 });
}
