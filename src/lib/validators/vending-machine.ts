import { z } from "zod";
import type { Coordinates } from "~/types/geolocation";

// 1. Coordinate Schema (reusable across your app)
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}) satisfies z.ZodType<Coordinates>;

// 2. Inventory Schema (strict validation for JSON field)
export const inventorySchema = z.record(
  z.string().min(1, "Product key must be at least 1 character"),
  z.number().int().nonnegative("Quantity must be 0 or positive")
).default({});

// 3. Main Vending Machine Schema
export const vendingMachineSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .optional(),
  coordinates: coordinatesSchema,
  address: z.string()
    .max(200, "Address too long")
    .optional(),
  inventory: inventorySchema
  // status: z.enum(["active", "maintenance", "out_of_service"])
  //   .default("active")
});

// 4. Update Schema (partial validation)
export const vendingMachineUpdateSchema = vendingMachineSchema.partial();

// Types for your application
export type VendingMachineInput = z.infer<typeof vendingMachineSchema>;
export type VendingMachineUpdateInput = z.infer<typeof vendingMachineUpdateSchema>;