import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import {
  driverSchema,
  newDriverVehicleSchema,
} from "~/lib/validators/driver-vehicle";

export const driverRouter = createTRPCRouter({
  // This creates and adds to existing depots / routes
  createMany: protectedProcedure
    .input(
      z.object({
        data: z.array(newDriverVehicleSchema),
        depotId: z.string(),
        routeId: z.string().optional(),
        override: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await Promise.all(
        input.data.map(async (driverVehicle) => {
          const { driver: driverData, vehicle: vehicleData } = driverVehicle;
          const { address: driverAddress, ...driverRest } = driverData;
          const { startAddress, endAddress, breaks, ...vehicleRest } =
            vehicleData;

          //Create driver for depot
          const driver = await ctx.db.driver.create({
            data: {
              depotId: input.depotId,
              ...driverRest,

              address: { create: { ...driverAddress } },
            },
            include: { address: true },
          });

          const defaultVehicleData = {
            ...vehicleRest,
            depotId: input.depotId,
            startAddress: { create: { ...startAddress } },
            breaks: {
              create: breaks?.map((b) => ({
                duration: b?.duration ?? 1800, //30 minutes in seconds
                start: b?.start ?? vehicleRest.shiftStart,
                end: b?.end ?? vehicleRest.shiftEnd,
              })),
            },
          };
          //Create default vehicle for driver
          const vehicle = await ctx.db.vehicle.create({
            data: { ...defaultVehicleData },
            include: {
              startAddress: true,
              endAddress: true,
              breaks: true,
            },
          });

          //Connect default vehicle to driver
          await ctx.db.driver.update({
            where: { id: driver.id },
            data: {
              vehicles: { connect: { id: vehicle.id } },
              defaultVehicleId: vehicle.id,
            },
          });

          if (endAddress) {
            const vehicleEndAddress = await ctx.db.address.create({
              data: { ...endAddress },
            });
            await ctx.db.vehicle.update({
              where: { id: vehicle.id },
              data: {
                endAddress: { connect: { id: vehicleEndAddress.id } },
              },
            });
          }
          //If routeId is provided, connect new vehicle to route
          if (input.routeId) {
            const routeVehicle = await ctx.db.vehicle.create({
              data: {
                driverId: driver.id,
                ...defaultVehicleData,
              },
            });

            if (endAddress) {
              const routeVehicleEndAddress = await ctx.db.address.create({
                data: { ...endAddress },
              });
              await ctx.db.vehicle.update({
                where: { id: routeVehicle.id },
                data: {
                  endAddress: { connect: { id: routeVehicleEndAddress.id } },
                },
              });
            }

            await ctx.db.route.update({
              where: { id: input.routeId },
              data: {
                vehicles: { connect: { id: routeVehicle.id } },
              },
            });
          }

          return { driver, vehicle } as DriverVehicleBundle;
        }),
      );

      return {
        data: res,
        message: "Driver(s) successfully created.",
      };
    }),

  deleteWithVehicles: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: driverId }) => {
      const driver = await ctx.db.driver.findUnique({
        where: { id: driverId },
        include: { vehicles: true },
      });

      if (driver?.vehicles) {
        await ctx.db.vehicle.deleteMany({
          where: { id: { in: driver.vehicles.map((v) => v.id) } },
        });
      }

      const deletedDriver = await ctx.db.driver.delete({
        where: { id: driverId },
      });

      return {
        data: deletedDriver,
        message: "Driver(s) successfully deleted from depot.",
      };
    }),

  update: protectedProcedure
    .input(z.object({ driver: driverSchema }))
    .mutation(async ({ ctx, input }) => {
      const { id, address, ...driverData } = input.driver;
      const updatedDriver = await ctx.db.driver.update({
        where: { id },
        data: {
          ...driverData,
          address: {
            upsert: {
              create: { ...address },
              update: { ...address },
            },
          },
        },
      });

      return {
        data: updatedDriver,
        message: "Driver details were successfully updated.",
      };
    }),

  getAll: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: depotId }) => {
      const drivers = await ctx.db.driver.findMany({
        where: { depotId },
        include: {
          address: true,
          vehicles: {
            include: {
              startAddress: true,
              endAddress: true,
              breaks: true,
            },
          },
        },
      });

      //Format into the DriverVehicleBundle type
      const bundles = drivers.map((driver) => {
        const defaultVehicle = driver.vehicles.find(
          (vehicle) => vehicle.id === driver.defaultVehicleId,
        );
        return {
          driver,
          vehicle: defaultVehicle,
        };
      });

      return bundles as DriverVehicleBundle[];
    }),

  deleteAllFromDepot: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: depotId }) => {
      const drivers = await ctx.db.driver.deleteMany({
        where: { depotId },
      });

      return {
        data: drivers,
        message: "Driver(s) successfully purged from depot.",
      };
    }),
});
