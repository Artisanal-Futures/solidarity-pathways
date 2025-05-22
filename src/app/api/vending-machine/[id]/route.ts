///app/api/vending-machine/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import{ type VendingMachine } from "~/types/vendingMachine";
import { vendingMachineUpdateSchema } from "~/lib/validators/vending-machine";
import { type Prisma } from "@prisma/client";


// Type-safe conversion utility
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
                   !Array.isArray(machine.inventory) &&
                   machine.inventory !== null
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

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<{ data?: VendingMachine; error?: string }>> {
  try {
    const session = await auth();
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const machine = await db.vendingMachine.findUnique({
      where: { id: params.id },
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

    if (!machine) {
      return NextResponse.json(
        { error: "Vending machine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      data: toVendingMachine(machine) 
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch machine" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<{ data?: VendingMachine; error?: string }>> {
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
    const validatedData = vendingMachineUpdateSchema.parse(body);

    // Prepare type-safe update data
    const updateData: Prisma.VendingMachineUpdateInput = {
      ...(validatedData.name !== undefined && { name: validatedData.name }),
      ...(validatedData.address !== undefined && { address: validatedData.address }),
      ...(validatedData.inventory !== undefined && { 
        inventory: validatedData.inventory as Prisma.InputJsonValue 
      }),
      ...(validatedData.coordinates && {
        latitude: validatedData.coordinates.latitude,
        longitude: validatedData.coordinates.longitude
      })
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const updatedMachine = await db.vendingMachine.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: updateData,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      data: toVendingMachine(updatedMachine) 
    });
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json(
      { error: "Invalid update data" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<{ error?: string }>> {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await db.vendingMachine.delete({
      where: { id: params.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Deletion failed:', error);
    return NextResponse.json(
      { error: "Failed to delete machine" },
      { status: 500 }
    );
  }
}