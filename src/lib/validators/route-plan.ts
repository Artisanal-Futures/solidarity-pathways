import { z } from "zod";

import { RouteStatus } from "@prisma/client";

export const editStopFormSchema = z.object({
  status: z.nativeEnum(RouteStatus, {
    required_error: "You need to select a notification type.",
  }),
  deliveryNotes: z.string().optional(),
});

export type EditStopFormValues = z.infer<typeof editStopFormSchema>;
