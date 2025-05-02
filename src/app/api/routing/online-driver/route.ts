/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

import { pusherServer } from "~/lib/soketi/server";

export async function POST(request: Request) {
  try {
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
    const { vehicleId, latitude, longitude } = body;

    if (!vehicleId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const vehicle = await db.vehicle.findFirst({
      where: { id: vehicleId },
      include: { driver: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const message = `${vehicle.driver?.name} is online`;

    // Trigger a Pusher event with the driver online status
    await pusherServer.trigger("map", `evt::notify-dispatch`, message);

    // If location data is provided, update the driver's location
    if (latitude && longitude) {
      await pusherServer.trigger("map", "evt::update-location", {
        vehicleId,
        latitude,
        longitude,
      });
    }

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error("Error in online-driver API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
