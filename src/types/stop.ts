import type { Prisma } from "@prisma/client";

import type { Coordinates } from "./geolocation";

export type TimeWindow = {
  startTime: string;
  endTime: string;
};

export type Stop = {
  id: number;
  customer_name: string;
  address: string;
  time_windows: TimeWindow[];
  coordinates: Coordinates;
  priority: number;
  drop_off_duration: number;
  prep_time_duration: number;
  email?: string;
  phone?: string;
  details?: string;
  color?: number | null;
};

export type OptimizedStop = Prisma.OptimizedStopGetPayload<{
  include: {
    job: {
      include: {
        client: true;
        address: true;
      };
    };
  };
}>;
