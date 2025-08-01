/* eslint-disable @typescript-eslint/no-unsafe-assignment */
//app/api/vending-machine/route.ts
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { type VendingMachine } from "~/types/vendingMachine";
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
   
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString()
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
      data: machines.map(toVendingMachine)
    });
  } catch (error) {
    console.error('GET vending machines error:', error);
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
    const body = await request.json();
    console.log("Received body:", body);
    const { coordinates, ...validatedData } = vendingMachineSchema.parse(body);

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
      { data: toVendingMachine(newMachine) },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST vending machine error:', error);
    return NextResponse.json(
      { error: "Invalid machine data" },
      { status: 400 }
    );
  }
}