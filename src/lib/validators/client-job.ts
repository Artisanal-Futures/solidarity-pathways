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

export const clientJobSchema = z.object({
  client: clientSchema.optional(),
  job: jobSchema,
});

export type ClientJobBundle = z.infer<typeof clientJobSchema>;
