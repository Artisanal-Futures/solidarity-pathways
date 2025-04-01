import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import axios from "axios";
import { uniqueId } from "lodash";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import type {
  VroomJob,
  VroomOptimizationData,
  VroomRouteData,
  VroomVehicle,
} from "~/lib/validators/optimization";
import type { OptimizedResponseData } from "~/types/optimized";
import { env } from "~/env";
import { formatGeometry } from "~/lib/optimization/vroom-optimization";
import { clientJobSchema } from "~/lib/validators/client-job";
import { driverVehicleSchema } from "~/lib/validators/driver-vehicle";
import {
  vroomDataSchema,
  vroomOptimizationSchema,
} from "~/lib/validators/optimization";

export const routeOptimizationRouter = createTRPCRouter({
  // Queries and mutations relating to the VROOM hosted optimization service

  calculateOptimalPaths: protectedProcedure
    .input(vroomDataSchema)
    .mutation(async ({ input }) => {
      const { data }: { data: VroomOptimizationData } = await axios.post(
        env.OPTIMIZATION_ENDPOINT,
        input,
      );

      if (!data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "There seems to be an issue connecting to API. Please try again later",
        });
      }

      const geometry = formatGeometry(data);

      return {
        data: {
          geometry,
          data,
        },
        message: "Successfully created a solution",
      };
    }),

  formatDriver: protectedProcedure
    .input(z.object({ data: z.array(driverVehicleSchema) }))
    .mutation(async ({ input }) => {
      const convertDriverToVehicle = (bundle: DriverVehicleBundle) => {
        return {
          id: parseInt(uniqueId()),
          profile: "car",
          description: bundle.vehicle.id ?? "",
          start: [
            bundle.vehicle.startAddress.longitude,
            bundle.vehicle.startAddress.latitude,
          ],
          end: [
            bundle.vehicle.startAddress.longitude,
            bundle.vehicle.startAddress.latitude,
          ],
          max_travel_time: bundle.vehicle.maxTravelTime ?? 10800,

          max_tasks: bundle.vehicle.maxTasks ?? 100,
          capacity: [250],
          skills: [1],
          breaks: bundle.vehicle.breaks?.map((tw) => ({
            id: tw.id,
            service: tw.duration,
            time_windows: [
              [bundle.vehicle.shiftStart, bundle.vehicle.shiftEnd],
            ],
          })) ?? [
            {
              id: 1,
              service: 1800,
              time_windows: [
                [bundle.vehicle.shiftStart, bundle.vehicle.shiftEnd],
              ],
            },
          ],
          time_window: [bundle.vehicle.shiftStart, bundle.vehicle.shiftEnd],
        };
      };
      return {
        data: input.data.map(convertDriverToVehicle) as VroomVehicle[],
        message: "Successfully formatted driver data",
      };
    }),

  formatClient: protectedProcedure
    .input(z.object({ data: z.array(clientJobSchema) }))
    .mutation(async ({ input }) => {
      const convertClientToJob = (bundle: ClientJobBundle) => {
        return {
          id: parseInt(uniqueId()),
          description: bundle.job.id ?? "",
          service: bundle.job.serviceTime ?? 1800,
          location: [bundle.job.address.longitude, bundle.job.address.latitude],
          skills: [1],
          priority: bundle.job.priority ?? 1,
          setup: bundle.job.prepTime ?? 0,
          time_windows: [
            [bundle.job.timeWindowStart, bundle.job.timeWindowEnd],
          ],
        };
      };

      return {
        data: input.data.map(convertClientToJob) as VroomJob[],
        message: "Successfully formatted client data",
      };
    }),

  formatResponse: protectedProcedure
    .input(z.object({ data: vroomOptimizationSchema }))
    .mutation(async ({ input }) => {
      const convertVroomResponseToOptimized: OptimizedResponseData = {
        summary: {
          totalDistance: input.data.summary.distance,
          totalDuration: input.data.summary.duration,
          totalPrepTime: input.data.summary.setup,
          totalServiceTime: input.data.summary.service,
          unassigned: input.data.unassigned.map((route) => route.description),
        },
        routes: input.data.routes.map((route: VroomRouteData) => ({
          vehicleId: route.description,
          geometry: route.geometry,
          totalDistance: route.distance,
          totalDuration: route.duration,
          totalPrepTime: route.setup,
          totalServiceTime: route.service,
          startTime: route.steps[0]?.arrival ?? 0,
          endTime: route.steps[route.steps.length - 1]?.arrival ?? 0,
          stops: route.steps.map((step) => ({
            jobId: step.description,
            arrival: step.arrival,
            departure:
              step.arrival +
              ((step?.service ?? 0) +
                (step?.setup ?? 0) +
                (step?.waiting_time ?? 0)),
            serviceTime: step?.service ?? 0,
            prepTime: step?.setup ?? 0,
            type: step?.type,
          })),
        })),
      };
      return {
        data: convertVroomResponseToOptimized,
        message: "Successfully formatted response",
      };
    }),
});
