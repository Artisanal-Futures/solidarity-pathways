import type { RouteStatus } from "@prisma/client";

import type { RouteData } from "./route";
import type { Polyline } from "~/types/geolocation";
import { VroomOptimizationData } from "~/lib/validators/optimization";

export type OptimizedStop = {
  id: string;
  routePathId: string;
  jobId: string | null;
  arrival: number;
  departure: number;
  duration: number;
  prep: number;
  type: string;
  notes: string | null;
  order: string | null;
  status: RouteStatus;
  createdAt: Date;
  updatedAt: Date;
  job?: {
    id: string;
    order: string | null;
    address?: {
      id: string;
      formatted: string;
      latitude: number;
      longitude: number;
    } | null;
    client?: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
};

export type OptimizedRoutePath = {
  id: string;
  routeId: string;
  vehicleId: string;
  stops: OptimizedStop[];
  distance: number | null;
  startTime: number | null;
  endTime: number | null;
  status: RouteStatus;
  geoJson: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OptimizedResponseData = {
  summary: {
    totalDistance: number;
    totalDuration: number;
    totalPrepTime: number;
    totalServiceTime: number;
    unassigned: string[];
  };
  routes: {
    vehicleId: string;
    geometry: string;
    totalDistance: number;
    totalDuration: number;
    totalPrepTime: number;
    totalServiceTime: number;
    startTime: number;
    endTime: number;
    stops: {
      jobId: string;
      arrival: number;
      departure: number;
      serviceTime: number;
      prepTime: number;
      type:
        | "job"
        | "pickup"
        | "delivery"
        | "shipment"
        | "break"
        | "start"
        | "end";
    }[];
  }[];
};

export type UnassignedData = {
  id: number;
  location: [number, number];
  description: string;
  type: string;
};

export type SummaryData = {
  amount: number[];
  computing_times: {
    loading: number;
    solving: number;
    routing: number;
  };
  cost: number;
  delivery: number[];
  distance: number;
  duration: number;
  pickup: number[];
  priority: number;
  routes: number;
  service: number;
  setup: number;
  unassigned: number;
  violations: unknown[];
  waiting_time: number;
};

export type OptimizationData = {
  code: number;
  routes: RouteData[];
  summary: SummaryData;
  unassigned: UnassignedData[];
};

export type VroomOptimalPaths = {
  geometry: Polyline[];
  data: VroomOptimizationData;
};
