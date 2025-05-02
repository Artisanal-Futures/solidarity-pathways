///types/vendingMachine.ts
import type { Prisma } from "@prisma/client";
import type { Coordinates } from "./geolocation";

// Use Prisma.JsonValue type correctly
type PrismaJson = Prisma.JsonValue;

export type VendingMachine = {
  id: string;
  name?: string | null;
  coordinates: Coordinates;
  address?: string | null;
  inventory: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
};

// Type guard with correct Prisma JSON type
export function isValidInventory(json: PrismaJson): json is Record<string, number> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return false;
  return Object.values(json).every(val => typeof val === "number");
}