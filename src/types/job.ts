import type { JobType } from "@prisma/client";

export type Address = {
  id?: string;
  formatted: string;
  latitude: number;
  longitude: number;
};

export type Job = {
  id: string;
  type: JobType;
  depotId: string;
  address?: Address | null;
  clientId?: string | null;
  prepTime: number;
  serviceTime: number;
  priority: number;
  timeWindowStart: number;
  timeWindowEnd: number;
  routeId?: string | null;
  isOptimized: boolean;
  notes?: string | null;
  order?: string | null;
  createdAt: Date;
  updatedAt: Date;
  optimizedStopId?: string | null;
};

export type Client = {
  id: string;
  depotId: string;
  name: string;
  address?: Address | null;
  phone?: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  defaultJobId?: string | null;
  jobs?: Job[];
};

export type Customer = {
  name: string;
  address: string;
  email: string;
  phone: string;
  prep_time: number;
  service_time: number;
  priority: number;
  time_start: string;
  time_end: string;
  lat: number;
  lon: number;
  order: string;
  notes: string;
};
