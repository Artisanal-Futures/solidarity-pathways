import * as z from "zod";

export const depotFormSchema = z.object({
  name: z.string().min(1).optional(),
  address: z
    .object({
      formatted: z.string(),
      latitude: z.coerce.number(),
      longitude: z.coerce.number(),
    })
    .optional(),

  magicCode: z.string(),
});

export type DepotFormData = z.infer<typeof depotFormSchema>;
