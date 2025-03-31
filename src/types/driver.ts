import type { DriverType } from "@prisma/client";

export type Driver = {
  id: string;
  type: DriverType;
  name: string;
  email: string;
  phone: string;
  depotId: string;
  defaultVehicleId?: string | null;

  vehicles: Vehicle[];

  address?: {
    formatted: string;
    latitude: number;
    longitude: number;
  };

  schedule?: {
    day:
      | "MONDAY"
      | "TUESDAY"
      | "WEDNESDAY"
      | "THURSDAY"
      | "FRIDAY"
      | "SATURDAY"
      | "SUNDAY";
    start: string;
    end: string;
  }[];
};

export type Vehicle = {
  id: string;
  depotId: string;
  driverId?: string | null;

  startAddress: {
    formatted: string;
    latitude: number;
    longitude: number;
  };

  endAddress?: {
    formatted: string;
    latitude: number;
    longitude: number;
  } | null;

  shiftStart: number;
  shiftEnd: number;

  capacity?: number;
  maxTasks?: number;
  maxTravelTime?: number;
  maxDistance?: number;

  breaks?: {
    id: number;
    duration: number;
    start?: number | null;
    end?: number | null;
  }[];

  notes?: string;
  cargo?: string;
  routeId?: string;
  optimizedRouteId?: string;
};

export type DriverVehicleBundle = {
  driver: Driver;
  vehicle: Vehicle;
};
