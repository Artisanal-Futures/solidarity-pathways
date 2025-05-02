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

export const vroomJobSchema = z.object({
  id: z.number(),
  description: z.string(),
  service: z.number(),
  location: z.array(z.number()),
  skills: z.array(z.number()),
  priority: z.number(),
  setup: z.number(),
  time_windows: z.array(z.array(z.number())),
});

export const vroomVehicleSchema = z.object({
  id: z.number(),
  profile: z.string(),
  description: z.string(),
  start: z.array(z.number()),
  end: z.array(z.number()),
  max_travel_time: z.number(),
  max_tasks: z.number(),
  capacity: z.array(z.number()),
  skills: z.array(z.number()),
  breaks: z.array(
    z.object({
      time_windows: z.array(z.array(z.number())),
      service: z.number(),
      id: z.number(),
    }),
  ),
  time_window: z.array(z.number()),
});

export const vroomDataSchema = z.object({
  jobs: z.array(vroomJobSchema),
  vehicles: z.array(vroomVehicleSchema),
  options: z.object({
    g: z.boolean(),
  }),
});

// Return Data

export const vroomSummarySchema = z.object({
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
});

export const vroomStepSchema = z.object({
  arrival: z.number(),
  distance: z.number(),
  duration: z.number(),
  load: z.array(z.number()),
  location: z.tuple([z.number(), z.number()]),
  service: z.number(),
  setup: z.number(),
  type: z.enum([
    "job",
    "pickup",
    "delivery",
    "shipment",
    "break",
    "start",
    "end",
    "vending", //
  ]),
  violations: z.array(z.unknown()),
  waiting_time: z.number(),
  description: z.string(),
  id: z.number().optional(),
  job: z.number().optional(),
});

export const vroomRouteSchema = z.object({
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
  steps: z.array(vroomStepSchema),
});

export const vroomUnassignedSchema = z.object({
  id: z.number(),
  location: z.tuple([z.number(), z.number()]),
  description: z.string(),
  type: z.string(),
  //type: z.enum(["job", "vending"]),
});

export const vroomOptimizationSchema = z.object({
  code: z.number(),
  routes: z.array(vroomRouteSchema),
  summary: vroomSummarySchema,
  unassigned: z.array(vroomUnassignedSchema),
});

export type VroomUnassignedData = z.infer<typeof vroomUnassignedSchema>;
export type VroomSummaryData = z.infer<typeof vroomSummarySchema>;
export type VroomRouteData = z.infer<typeof vroomRouteSchema>;
export type VroomOptimizationData = z.infer<typeof vroomOptimizationSchema>;
export type VroomData = z.infer<typeof vroomDataSchema>;
export type VroomVehicle = z.infer<typeof vroomVehicleSchema>;
export type VroomJob = z.infer<typeof vroomJobSchema>;
export type OptimizationPlan = z.infer<typeof optimizationPlanSchema>;
