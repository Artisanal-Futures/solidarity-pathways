import {
  militaryTimeToUnixSeconds,
  minutesToSeconds,
} from "~/utils/generic/format-utils.wip";

import { uniqueId } from "lodash";
import type { Customer } from "~/types";
import { jobTypeSchema } from "~/types.wip";

export const makeOneClientJob = (data: Customer) => {
  const clientId = uniqueId("client_");
  const addressId = uniqueId("address_");
  const jobId = uniqueId("job_");

  return {
    client: {
      id: clientId,
      email: data.email ?? "",
      phone: data.phone ?? undefined,
      name: data.name ?? "",
      addressId: addressId,
      address: {
        formatted: data?.address,
        latitude: data?.lat,
        longitude: data?.lon,
      },
    },
    job: {
      id: jobId,
      addressId: addressId,
      clientId: clientId,

      address: {
        formatted: data?.address,
        latitude: data?.lat,
        longitude: data?.lon,
      },

      type: jobTypeSchema.parse("DELIVERY"),
      prepTime: minutesToSeconds(data?.prep_time ?? 0),
      priority: Number(data?.priority ?? 0),
      serviceTime: minutesToSeconds(data?.service_time ?? 0),
      timeWindowStart: militaryTimeToUnixSeconds(data.time_start),
      timeWindowEnd: militaryTimeToUnixSeconds(data.time_end),
      order: data?.order ?? "",
      notes: data?.notes ?? "",
    },
  };
};
