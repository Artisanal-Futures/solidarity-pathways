import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import axios from "axios";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import type { Address } from "~/types/geolocation";
import { env } from "~/env";
import { geocodeByAddress } from "~/lib/geocode/geocode-address";
import { clientSchema } from "~/lib/validators/client-job";

type GeocodingResponse = google.maps.GeocoderResponse;

const geocodeCache: Record<string, unknown> = {};

export const geocodeRouter = createTRPCRouter({
  byAddress: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: addressQuery }) => {
      const address = await geocodeByAddress(addressQuery);

      return {
        formatted: address.full_address,
        latitude: address.lat,
        longitude: address.lon,
      } as Address;
    }),
});
