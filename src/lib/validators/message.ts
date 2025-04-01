import * as z from "zod";

export const messageFormSchema = z.object({
  message: z.string(),
});

export type MessageFormValues = z.infer<typeof messageFormSchema>;
