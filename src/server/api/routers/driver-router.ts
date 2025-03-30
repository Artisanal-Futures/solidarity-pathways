import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { driverSchema, driverVehicleSchema, vehicleSchema } from "~/types.wip";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import type { DriverVehicleBundle } from "~/types.wip";

export const driverRouter = createTRPCRouter({
  setDepotVehicles: protectedProcedure
    .input(
      z.object({ data: z.array(driverVehicleSchema), depotId: z.string() }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.depot.update({
        where: { id: input.depotId },

        data: {
          drivers: {
            deleteMany: {},
          },
          vehicles: {
            deleteMany: {},
          },
        },
      });

      const res = await Promise.all(
        input.data.map(async (driverVehicle) => {
          const driver = await ctx.db.driver.create({
            data: {
              depotId: input.depotId,
              name: driverVehicle.driver.name,
              email: driverVehicle.driver.email,
              phone: driverVehicle.driver.phone,
              address: {
                create: {
                  formatted: driverVehicle.driver.address.formatted,
                  latitude: driverVehicle.driver.address.latitude,
                  longitude: driverVehicle.driver.address.longitude,
                },
              },
            },
            include: {
              address: true,
            },
          });

          const vehicle = await ctx.db.vehicle.create({
            data: {
              depotId: input.depotId,
              startAddress: {
                create: {
                  formatted: driverVehicle.driver.address.formatted,
                  latitude: driverVehicle.driver.address.latitude,
                  longitude: driverVehicle.driver.address.longitude,
                },
              },
              shiftStart: driverVehicle.vehicle.shiftStart,
              shiftEnd: driverVehicle.vehicle.shiftEnd,
              cargo: driverVehicle.vehicle.cargo ?? "",
              notes: driverVehicle.vehicle.notes ?? "",

              capacity: driverVehicle.vehicle.capacity,
              maxTasks: driverVehicle.vehicle.maxTasks,
              maxTravelTime: driverVehicle.vehicle.maxTravelTime,
              maxDistance: driverVehicle.vehicle.maxDistance,
              breaks: {
                create: driverVehicle?.vehicle?.breaks?.map((b) => ({
                  duration: b?.duration ?? 1800, //30 minutes in seconds
                  start: b?.start ?? driverVehicle.vehicle.shiftStart,
                  end: b?.end ?? driverVehicle.vehicle.shiftEnd,
                })),
              },
            },
            include: {
              startAddress: true,
              endAddress: true,
            },
          });

          await ctx.db.driver.update({
            where: { id: driver.id },
            data: {
              vehicles: {
                connect: {
                  id: vehicle.id,
                },
              },
              defaultVehicleId: vehicle.id,
            },
          });

          return { driver, vehicle } as DriverVehicleBundle;
        }),
      );

      return {
        data: res,
        message: "Depot drivers were successfully set.",
      };
    }),

  // This creates and adds to existing depots / routes
  createVehicleBundles: protectedProcedure
    .input(
      z.object({
        data: z.array(driverVehicleSchema),
        depotId: z.string(),
        routeId: z.string().optional(),
        override: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await Promise.all(
        input.data.map(async (driverVehicle) => {
          //Create driver for depot
          const driver = await ctx.db.driver.create({
            data: {
              depotId: input.depotId,
              name: driverVehicle.driver.name,
              email: driverVehicle.driver.email,
              phone: driverVehicle.driver.phone,
              address: {
                create: {
                  formatted: driverVehicle.driver.address.formatted,
                  latitude: driverVehicle.driver.address.latitude,
                  longitude: driverVehicle.driver.address.longitude,
                },
              },
            },
            include: {
              address: true,
            },
          });

          //Create default vehicle for driver
          const vehicle = await ctx.db.vehicle.create({
            data: {
              depotId: input.depotId,

              startAddress: {
                create: {
                  formatted: driverVehicle.vehicle.startAddress.formatted,
                  latitude: driverVehicle.vehicle.startAddress.latitude,
                  longitude: driverVehicle.vehicle.startAddress.longitude,
                },
              },
              shiftStart: driverVehicle.vehicle.shiftStart,
              shiftEnd: driverVehicle.vehicle.shiftEnd,
              cargo: driverVehicle.vehicle.cargo ?? "",
              notes: driverVehicle.vehicle.notes ?? "",

              capacity: driverVehicle.vehicle.capacity,
              maxTasks: driverVehicle.vehicle.maxTasks,
              maxTravelTime: driverVehicle.vehicle.maxTravelTime,
              maxDistance: driverVehicle.vehicle.maxDistance,
              breaks: {
                create: driverVehicle?.vehicle?.breaks?.map((b) => ({
                  duration: b?.duration ?? 1800, //30 minutes in seconds
                  start: b?.start ?? driverVehicle.vehicle.shiftStart,
                  end: b?.end ?? driverVehicle.vehicle.shiftEnd,
                })),
              },
            },
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
              vehicles: {
                connect: {
                  id: vehicle.id,
                },
              },
              defaultVehicleId: vehicle.id,
            },
          });

          if (driverVehicle.vehicle.endAddress) {
            const endAddress = await ctx.db.address.create({
              data: {
                formatted: driverVehicle?.vehicle?.endAddress?.formatted,
                latitude: driverVehicle.vehicle.endAddress.latitude,
                longitude: driverVehicle.vehicle.endAddress.longitude,
              },
            });
            await ctx.db.vehicle.update({
              where: { id: vehicle.id },
              data: {
                endAddress: {
                  connect: {
                    id: endAddress.id,
                  },
                },
              },
            });
          }
          //If routeId is provided, connect new vehicle to route
          if (input.routeId) {
            const routeVehicle = await ctx.db.vehicle.create({
              data: {
                depotId: input.depotId,
                driverId: driver.id,
                startAddress: {
                  create: {
                    formatted: vehicle.startAddress!.formatted,
                    latitude: vehicle.startAddress!.latitude,
                    longitude: vehicle.startAddress!.longitude,
                  },
                },

                shiftStart: driverVehicle.vehicle.shiftStart,
                shiftEnd: driverVehicle.vehicle.shiftEnd,
                cargo: driverVehicle.vehicle.cargo ?? "",
                notes: driverVehicle.vehicle.notes ?? "",

                capacity: driverVehicle.vehicle.capacity,
                maxTasks: driverVehicle.vehicle.maxTasks,
                maxTravelTime: driverVehicle.vehicle.maxTravelTime,
                maxDistance: driverVehicle.vehicle.maxDistance,
                breaks: {
                  create: driverVehicle?.vehicle?.breaks?.map((b) => ({
                    duration: b?.duration ?? 1800, //30 minutes in seconds
                    start: b?.start ?? driverVehicle.vehicle.shiftStart,
                    end: b?.end ?? driverVehicle.vehicle.shiftEnd,
                  })),
                },
              },
            });

            if (driverVehicle.vehicle.endAddress) {
              const routeEndAddress = await ctx.db.address.create({
                data: {
                  formatted: driverVehicle?.vehicle?.endAddress.formatted,
                  latitude: driverVehicle.vehicle.endAddress.latitude,
                  longitude: driverVehicle.vehicle.endAddress.longitude,
                },
              });
              await ctx.db.vehicle.update({
                where: { id: routeVehicle.id },
                data: {
                  endAddress: {
                    connect: {
                      id: routeEndAddress.id,
                    },
                  },
                },
              });
            }

            await ctx.db.route.update({
              where: { id: input.routeId },
              data: {
                vehicles: {
                  connect: {
                    id: routeVehicle.id,
                  },
                },
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

  deleteVehicle: protectedProcedure
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

  deleteDriver: protectedProcedure
    .input(z.object({ driverId: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.driver.delete({
        where: { id: input.driverId },
      });
    }),

  deleteVehicleBundle: protectedProcedure
    .input(
      z.object({
        driverId: z.string(),
        vehicleId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const driver = await ctx.db.driver.findUnique({
        where: { id: input.driverId },
        include: { vehicles: true },
      });

      if (driver?.vehicles) {
        await ctx.db.vehicle.deleteMany({
          where: { id: { in: driver.vehicles.map((v) => v.id) } },
        });
      }

      const deletedDriver = await ctx.db.driver.delete({
        where: {
          id: input.driverId,
        },
      });

      return {
        data: deletedDriver,
        message: "Driver(s) successfully deleted from depot.",
      };
    }),

  updateDriverDefaults: protectedProcedure
    .input(
      z.object({
        defaultId: z.string(),
        depotId: z.string(),
        bundle: driverVehicleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const defaultVehicle = await ctx.db.vehicle.findUnique({
        where: { id: input.defaultId },
      });

      if (!defaultVehicle) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Default vehicle not found",
        });
      }

      await ctx.db.vehicle.update({
        where: { id: input.defaultId },
        data: { breaks: { deleteMany: {} } },
      });

      const updatedVehicle = await ctx.db.vehicle.update({
        where: { id: defaultVehicle.id },
        data: {
          startAddress: {
            update: {
              formatted: input.bundle.vehicle.startAddress.formatted,
              latitude: input.bundle.vehicle.startAddress.latitude,
              longitude: input.bundle.vehicle.startAddress.longitude,
            },
          },
          shiftStart: input.bundle.vehicle.shiftStart,
          shiftEnd: input.bundle.vehicle.shiftEnd,
          cargo: input.bundle.vehicle.cargo ?? "",
          notes: input.bundle.vehicle.notes ?? "",
          capacity: input.bundle.vehicle.capacity,
          maxTasks: input.bundle.vehicle.maxTasks,
          maxTravelTime: input.bundle.vehicle.maxTravelTime,
          maxDistance: input.bundle.vehicle.maxDistance,
          breaks: {
            create: input.bundle?.vehicle?.breaks?.map((b) => ({
              duration: b?.duration ?? 1800, //30 minutes in seconds
              start: b?.start ?? input.bundle.vehicle.shiftStart,
              end: b?.end ?? input.bundle.vehicle.shiftEnd,
            })),
          },
        },
      });

      if (!input.bundle.vehicle.endAddress) {
        return {
          data: updatedVehicle,
          message: "Driver defaults were successfully updated.",
        };
      }

      const updatedVehicleWithEndAddress = await ctx.db.vehicle.update({
        where: {
          id: defaultVehicle.id,
        },
        data: {
          endAddress: {
            upsert: {
              create: {
                formatted: input.bundle.vehicle.endAddress.formatted,
                latitude: input.bundle.vehicle.endAddress.latitude,
                longitude: input.bundle.vehicle.endAddress.longitude,
              },
              update: {
                formatted: input.bundle.vehicle.endAddress.formatted,
                latitude: input.bundle.vehicle.endAddress.latitude,
                longitude: input.bundle.vehicle.endAddress.longitude,
              },
            },
          },
        },
      });
      return {
        data: updatedVehicleWithEndAddress,
        message: "Driver defaults were successfully updated.",
      };
    }),

  updateDriverDetails: protectedProcedure
    .input(z.object({ driver: driverSchema }))
    .mutation(async ({ ctx, input }) => {
      const updatedDriver = await ctx.db.driver.update({
        where: {
          id: input.driver.id,
        },
        data: {
          name: input?.driver?.name,
          email: input?.driver?.email,
          phone: input?.driver?.phone,
          address: {
            upsert: {
              create: {
                formatted: input.driver?.address.formatted,
                latitude: input.driver?.address.latitude,
                longitude: input.driver?.address.longitude,
              },
              update: {
                formatted: input.driver?.address.formatted,
                latitude: input.driver?.address.latitude,
                longitude: input.driver?.address.longitude,
              },
            },
          },
        },
      });

      return {
        data: updatedDriver,
        message: "Driver details were successfully updated.",
      };
    }),

  updateVehicleDetails: protectedProcedure
    .input(z.object({ vehicle: vehicleSchema, routeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.vehicle.update({
        where: {
          id: input.vehicle.id,
          routeId: input.routeId,
        },
        data: { breaks: { deleteMany: {} } },
      });

      const updatedVehicle = await ctx.db.vehicle.update({
        where: {
          id: input.vehicle.id,
          routeId: input.routeId,
        },
        data: {
          startAddress: {
            upsert: {
              update: {
                formatted: input.vehicle.startAddress.formatted,
                latitude: input.vehicle.startAddress.latitude,
                longitude: input.vehicle.startAddress.longitude,
              },
              create: {
                formatted: input.vehicle.startAddress.formatted,
                latitude: input.vehicle.startAddress.latitude,
                longitude: input.vehicle.startAddress.longitude,
              },
            },
          },

          shiftStart: input.vehicle.shiftStart,
          shiftEnd: input.vehicle.shiftEnd,
          cargo: input.vehicle.cargo ?? "",
          notes: input.vehicle.notes ?? "",
          capacity: input.vehicle.capacity,
          maxTasks: input.vehicle.maxTasks,
          maxTravelTime: input.vehicle.maxTravelTime,
          maxDistance: input.vehicle.maxDistance,
          breaks: {
            create: input.vehicle?.breaks?.map((b) => ({
              duration: b?.duration ?? 1800, //30 minutes in seconds
              start: b?.start ?? input.vehicle.shiftStart,
              end: b?.end ?? input.vehicle.shiftEnd,
            })),
          },
        },
      });

      if (!input.vehicle.endAddress) {
        return {
          data: updatedVehicle,
          message: "Vehicle details were successfully updated.",
        };
      }

      const updatedVehicleWithEndAddress = await ctx.db.vehicle.update({
        where: {
          id: updatedVehicle.id,
        },
        data: {
          endAddress: {
            upsert: {
              update: {
                formatted: input.vehicle.endAddress.formatted,
                latitude: input.vehicle.endAddress.latitude,
                longitude: input.vehicle.endAddress.longitude,
              },
              create: {
                formatted: input.vehicle.endAddress.formatted,
                latitude: input.vehicle.endAddress.latitude,
                longitude: input.vehicle.endAddress.longitude,
              },
            },
          },
        },
      });

      return {
        data: updatedVehicleWithEndAddress,
        message: "Vehicle details were successfully updated.",
      };
    }),

  getDepotDrivers: protectedProcedure
    .input(z.object({ depotId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.depotId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Depot ID is required",
        });
      }

      const drivers = await ctx.db.driver.findMany({
        where: { depotId: input.depotId },
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

  getRouteVehicles: protectedProcedure
    .input(z.object({ routeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const vehicles = await ctx.db.vehicle.findMany({
        where: {
          routeId: input.routeId,
        },
        include: {
          startAddress: true,
          endAddress: true,
          breaks: true,
          driver: {
            include: {
              address: true,
            },
          },
        },
      });

      //Format into the DriverVehicleBundle type
      const bundles = vehicles.map((vehicle) => ({
        driver: vehicle.driver,
        vehicle,
      }));

      return bundles as DriverVehicleBundle[];
    }),

  deleteAllDepotDrivers: protectedProcedure
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

  deleteAllVehicles: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: depotId }) => {
      const vehicle = await ctx.db.vehicle.deleteMany({
        where: { depotId },
      });

      return {
        data: vehicle,
        message: "Vehicle(s) successfully purged from depot.",
      };
    }),
});
