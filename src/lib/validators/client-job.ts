import { z } from "zod";

import { JobType } from "@prisma/client";

export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  addressId: z.string().optional(),
  address: z
    .object({
      formatted: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  email: z.string().email(),
  phone: z.coerce.string().optional(),
  defaultJobId: z.string().optional().nullish(),
});

export const jobSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(JobType),
  addressId: z.string().optional(),
  address: z.object({
    formatted: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  clientId: z.string().optional().nullish(),

  serviceTime: z.number(),
  prepTime: z.number(),
  priority: z.number(),
  timeWindowStart: z.number(),
  timeWindowEnd: z.number(),
  notes: z.string().optional(),
  order: z.string().optional(),
  isOptimized: z.boolean().optional(),
});

// .refine((input) => {
//   // allows bar to be optional only when foo is 'foo'
//   if (
//     input.clientId !== undefined &&
//     (input.email === undefined || input.email === null || input.email === "")
//   )
//     return false;

//   return true;
// });

export const clientJobSchema = z.object({
  client: clientSchema.optional(),
  job: jobSchema,
});

export const newClientJobSchema = z.object({
  client: clientSchema
    .omit({ id: true, addressId: true, defaultJobId: true })
    .optional(),
  job: jobSchema.omit({
    id: true,
    addressId: true,
    isOptimized: true,
    clientId: true,
  }),
});

export type ClientJobBundle = z.infer<typeof clientJobSchema>;

export type NewClientJobBundle = z.infer<typeof newClientJobSchema>;

export const jobTypeSchema = z.enum(["DELIVERY", "PICKUP"]);
