import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { driverSchema, driverVehicleSchema, vehicleSchema } from "~/types.wip";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import type { DriverVehicleBundle } from "~/types.wip";

// Vehicles are the entities used per route.
export const vehicleRouter = createTRPCRouter({
  update: protectedProcedure
    .input(vehicleSchema.extend({ routeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, routeId, breaks, startAddress, endAddress, ...vehicleData } =
        input;

      await ctx.db.vehicle.update({
        where: { id, routeId },
        data: { breaks: { deleteMany: {} } },
      });

      const updatedVehicle = await ctx.db.vehicle.update({
        where: { id, routeId },
        data: {
          ...vehicleData,
          startAddress: {
            upsert: {
              update: { ...startAddress },
              create: { ...startAddress },
            },
          },
          breaks: {
            create: breaks?.map((vehicleBreak) => ({
              duration: vehicleBreak?.duration ?? 1800, //30 minutes in seconds
              start: vehicleBreak?.start ?? input.shiftStart,
              end: vehicleBreak?.end ?? input.shiftEnd,
            })),
          },
        },
      });

      if (endAddress) {
        await ctx.db.vehicle.update({
          where: { id: updatedVehicle.id },
          data: {
            endAddress: {
              upsert: {
                update: { ...endAddress },
                create: { ...endAddress },
              },
            },
          },
        });
      }

      return {
        data: updatedVehicle,
        message: "Vehicle details were successfully updated.",
      };
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: vehicleId }) => {
      const deletedVehicle = await ctx.db.vehicle.delete({
        where: { id: vehicleId },
      });
      return {
        data: deletedVehicle,
        message: "Vehicles(s) successfully deleted from route.",
      };
    }),
});
