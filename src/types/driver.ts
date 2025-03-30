import type { DriverType } from "@prisma/client";

export type Driver = {
  id: string;
  type: DriverType;
  name: string;
  email: string;
  phone: string;

  address: {
    formatted: string;
    latitude: number;
    longitude: number;
  };
  shiftStart: number;
  shiftEnd: number;

  breaks: {
    id: number;
    duration: number;
    start?: number | null | undefined;
    end?: number | null | undefined;
  }[];

  capacity?: number;
  maxTravelTime?: number;
  maxTasks?: number;
  maxDistance?: number;

  notes?: string;
  cargo?: string;
};
