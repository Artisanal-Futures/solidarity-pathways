import * as z from "zod";

export const addressSchema = z.object({
  formatted: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});
