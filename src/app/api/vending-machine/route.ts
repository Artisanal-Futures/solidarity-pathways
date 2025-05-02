///app/api/vending-machine/route.ts
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import{ type VendingMachine } from "~/types/vendingMachine";
import { vendingMachineSchema } from "~/lib/validators/vending-machine";
import { type Prisma } from "@prisma/client";

// Type-safe conversion function
function toVendingMachine(machine: {
  id: string;
  name?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  inventory: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): VendingMachine {
  // Safely handle inventory conversion
  const inventory = typeof machine.inventory === 'object' && 
                   machine.inventory !== null &&
                   !Array.isArray(machine.inventory)
    ? machine.inventory as Record<string, number>
    : {};

  return {
    id: machine.id,
    name: machine.name,
    coordinates: {
      latitude: machine.latitude,
      longitude: machine.longitude
    },
    address: machine.address,
    inventory,
    createdAt: machine.createdAt,
    updatedAt: machine.updatedAt
  };
}

export async function GET(): Promise<
  NextResponse<{ 
    data?: VendingMachine[];
    error?: string;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const machines = await db.vendingMachine.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        inventory: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ 
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      data: machines.map(toVendingMachine) 
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch machines" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<
  NextResponse<{
    data?: VendingMachine;
    error?: string;
  }>
> {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await request.json();
    console.log("Received body:", body);
    const { coordinates, ...validatedData } = vendingMachineSchema.parse(body);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const newMachine = await db.vendingMachine.create({
      data: {
        ...validatedData,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        inventory: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { data: toVendingMachine(newMachine) },
      { status: 201 }
    );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid machine data" },
      { status: 400 }
    );
  }
}