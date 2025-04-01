import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { vehicleSchema } from "~/lib/validators/driver-vehicle";

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

  getBundles: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: routeId }) => {
      const data = await ctx.db.vehicle.findMany({
        where: { routeId },
        include: {
          driver: { include: { address: true } },
          startAddress: true,
          endAddress: true,
          breaks: true,
        },
      });

      const bundles = data.map((vehicle) => ({
        driver: vehicle.driver ?? null,
        vehicle: vehicle,
      }));

      return (bundles as unknown as DriverVehicleBundle[]) ?? [];
    }),

  getBundleById: protectedProcedure
    .input(z.object({ routeId: z.string(), vehicleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.vehicle.findUnique({
        where: {
          routeId: input.routeId,
          id: input.vehicleId,
        },
        include: {
          driver: { include: { address: true } },
          startAddress: true,
          endAddress: true,
          breaks: true,
        },
      });

      return {
        driver: data?.driver ?? null,
        vehicle: data,
      } as unknown as DriverVehicleBundle;
    }),
});
