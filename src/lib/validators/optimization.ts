import { z } from "zod";

export const optimizationPlanSchema = z.object({
  geometry: z.array(
    z.object({
      type: z.string(),
      coordinates: z.array(z.array(z.number(), z.number())),
      properties: z
        .object({
          color: z.number().optional(),
        })
        .optional(),
    }),
  ),
  data: z.object({
    code: z.number(),
    routes: z.array(
      z.object({
        amount: z.array(z.number()),
        cost: z.number(),
        delivery: z.array(z.number()),
        description: z.string(),
        distance: z.number(),
        duration: z.number(),
        geometry: z.string(),
        pickup: z.array(z.number()),
        priority: z.number(),
        service: z.number(),
        setup: z.number(),
        vehicle: z.number(),
        violations: z.array(z.unknown()),
        waiting_time: z.number(),
        steps: z.array(
          z.object({
            arrival: z.number(),
            distance: z.number(),
            duration: z.number(),
            load: z.array(z.number()),
            location: z.array(z.number(), z.number()).optional(),
            service: z.number(),
            setup: z.number(),
            type: z.string(),
            violations: z.array(z.unknown()),
            waiting_time: z.number(),
            description: z.string().optional(),
            id: z.number().optional(),
            job: z.number().optional(),
          }),
        ),
      }),
    ),
    summary: z.object({
      amount: z.array(z.number()),
      computing_times: z.object({
        loading: z.number(),
        solving: z.number(),
        routing: z.number(),
      }),
      cost: z.number(),
      delivery: z.array(z.number()),
      distance: z.number(),
      duration: z.number(),
      pickup: z.array(z.number()),
      priority: z.number(),
      routes: z.number(),
      service: z.number(),
      setup: z.number(),
      unassigned: z.number(),
      violations: z.array(z.unknown()),
      waiting_time: z.number(),
    }),
    unassigned: z.array(
      z.object({
        id: z.number(),
        location: z.array(z.number(), z.number()),
        description: z.string(),
        type: z.string(),
      }),
    ),
  }),
});

export type OptimizationPlan = z.infer<typeof optimizationPlanSchema>;
