/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NextResponse } from "next/server";
import { db } from "~/server/db";

import { pusherServer } from "~/lib/soketi/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude, pathId } = body;

    if (!latitude || !longitude || !pathId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const optimizedPath = await db.optimizedRoutePath.findUnique({
      where: {
        id: pathId,
      },
    });

    if (!optimizedPath) {
      return NextResponse.json(
        { error: "Invalid optimized path" },
        { status: 400 },
      );
    }

    const driver = await db.vehicle.findFirst({
      where: {
        id: optimizedPath.vehicleId,
      },
      include: {
        driver: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "No driver found" }, { status: 400 });
    }

    // Trigger a Pusher event with the updated locations
    await pusherServer.trigger("map", "evt::update-location", {
      vehicleId: optimizedPath.vehicleId,
      latitude,
      longitude,
    });

    return NextResponse.json({ message: "Location updated" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(error, { status: 400 });
  }
}
