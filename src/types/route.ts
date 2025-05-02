import type { Prisma } from "@prisma/client";

export type OptimizedRoutePath = Prisma.OptimizedRoutePathGetPayload<{
  include: {
    stops: true;
  };
}>;

export type StepData = {
  arrival: number;
  distance: number;
  duration: number;
  load: number[];
  location: [number, number];
  service: number;
  setup: number;
  type: string;
  violations: unknown[];
  waiting_time: number;
  description?: string;
  id?: number;
  job?: number;
};

export type RouteData = {
  amount: number[];
  cost: number;
  delivery: number[];
  description: string;
  distance: number;
  duration: number;
  geometry: string;
  pickup: number[];
  priority: number;
  service: number;
  setup: number;
  vehicle: number;
  violations: unknown[];
  waiting_time: number;
  steps: StepData[];
};

export type ExpandedStepData = StepData & {
  status?: "failed" | "success" | "pending";
  deliveryNotes?: string;
};

export type ExpandedRouteData = RouteData & {
  steps: ExpandedStepData[];
  routeId?: string;
};
