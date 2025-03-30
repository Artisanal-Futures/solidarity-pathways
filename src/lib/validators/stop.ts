import { z } from "zod";

import { JobType } from "@prisma/client";

export const stopFormSchema = z
  .object({
    id: z.string(),
    clientId: z.string().optional(),

    clientAddressId: z.string().optional(),
    addressId: z.string().optional(),

    type: z.nativeEnum(JobType),
    name: z
      .string()
      .min(2, {
        message: "Name must be at least 2 characters.",
      })
      .max(30, {
        message: "Name must not be longer than 30 characters.",
      }),
    clientAddress: z
      .object({
        formatted: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .optional(),

    address: z.object({
      formatted: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }),
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\d{3}\d{3}\d{4}$/, {
        message: "Phone number must be in the format XXXXXXXXXX.",
      })
      .optional()
      .nullish(),

    timeWindowStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Invalid time format. Time must be in HH:MM format.",
    }),

    timeWindowEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "Invalid time format. Time must be in HH:MM format.",
    }),

    serviceTime: z.coerce.number().min(0),
    prepTime: z.coerce.number().min(0),
    priority: z.coerce.number().min(0),

    notes: z.string().optional(),
    order: z.string().optional(),
  })
  .refine((input) => {
    // allows bar to be optional only when foo is 'foo'
    if (
      input.clientId !== undefined &&
      (input.email === undefined || input.email === null || input.email === "")
    )
      return false;

    return true;
  });

export type StopFormValues = z.infer<typeof stopFormSchema>;
