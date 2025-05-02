export type VersionOneDriverCSV = {
  name: string;
  address: string;
  email: string;
  phone: string;
  default_capacity: number;
  default_distance: number;
  default_shift_start: string;
  default_shift_end: string;
  default_travel_time: number;
  default_stops: number;
  default_breaks: string;
};

export type VersionOneClientCSV = {
  name: string;
  address: string;
  email?: string;
  phone?: string;
  prep_time?: number;
  service_time?: number;
  priority?: number;

  time_start?: string;
  time_end?: string;

  notes?: string;
  order?: string;

  default_order?: boolean;
};
