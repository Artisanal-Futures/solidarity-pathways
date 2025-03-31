import * as z from "zod";

import { DriverType } from "@prisma/client";

export const driverSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(DriverType),
  name: z.string(),
  addressId: z.string().optional(),
  address: z.object({
    formatted: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  email: z.string().email(),
  phone: z.coerce.string(),
  defaultVehicleId: z.string().optional(),
});

export const vehicleSchema = z.object({
  id: z.string(),
  type: z.string().optional(),

  startAddressId: z.string().optional(),
  endAddressId: z.string().optional(),

  startAddress: z.object({
    formatted: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  endAddress: z
    .object({
      formatted: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  capacity: z.number().optional(),
  maxTasks: z.number().optional(),
  maxTravelTime: z.number().optional(),
  maxDistance: z.number().optional(),
  shiftStart: z.number(),
  shiftEnd: z.number(),
  notes: z.string().optional(),
  cargo: z.string().optional(),
  breaks: z
    .array(
      z.object({
        id: z.number(),
        duration: z.number(),
        start: z.number().optional(),
        end: z.number().optional(),
      }),
    )
    .optional(),
});

export const driverVehicleSchema = z.object({
  driver: driverSchema,
  vehicle: vehicleSchema,
});

export const newDriverVehicleSchema = z.object({
  driver: driverSchema.omit({ id: true, addressId: true }),
  vehicle: vehicleSchema.omit({
    id: true,
    type: true,
    startAddressId: true,
    endAddressId: true,
  }),
});

export type DriverVehicleBundle = z.infer<typeof driverVehicleSchema>;
export type NewDriverVehicleBundles = z.infer<typeof newDriverVehicleSchema>;
export type Driver = z.infer<typeof driverSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
