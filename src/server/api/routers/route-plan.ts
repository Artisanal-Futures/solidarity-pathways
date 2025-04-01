import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import { RouteStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import { pusherServer } from "~/lib/soketi/server";
import { driverVehicleSchema } from "~/lib/validators/driver-vehicle";
import { optimizationPlanSchema } from "~/lib/validators/optimization";

export const routePlanRouter = createTRPCRouter({
  clearOptimizedStops: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: routeId }) => {
      await ctx.db.route.update({
        where: { id: routeId },
        data: { optimizedRoute: { deleteMany: {} }, optimizedData: null },
      });

      await ctx.db.job.updateMany({
        where: { routeId: routeId },
        data: { isOptimized: false },
      });

      // Notify UI
      await pusherServer.trigger(
        "map",
        `evt::clear-route`,
        `evt::invalidate-stops`,
      );

      console.log("i should've cleared the route!!");

      return {
        data: "success",
        message: "Optimized stops were successfully cleared.",
      };
    }),

  optimizeWithVroom: protectedProcedure
    .input(
      z.object({
        plan: optimizationPlanSchema,
        routeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.route.update({
        where: { id: input.routeId },
        data: { optimizedRoute: { deleteMany: {} } },
      });
      const unassigned = input.plan.data.unassigned.map(
        (job) => job.description,
      );

      const routes = input.plan.data.routes.map((route) => ({
        routeId: input.routeId,
        vehicleId: route.description,
        geoJson: route.geometry,
        stops: route.steps.map((step) => ({
          arrival: step.arrival,
          departure: step.arrival + (step.service + step.setup),
          duration: step.service + step.setup + step.waiting_time,
          prep: step.setup,
          type: step.type,
          jobId: step?.description ?? null,
          status: RouteStatus.PENDING,
        })),
      }));

      await ctx.db.job.updateMany({
        where: {
          routeId: input.routeId,
          id: { notIn: unassigned },
        },
        data: { isOptimized: true },
      });

      await Promise.all(
        routes.map(async (route) => {
          const totalDistance = route.stops.reduce((acc, stop, index) => {
            if (index === 0) return acc;
            const prevStop = route.stops[index - 1];
            return acc + (prevStop?.duration ?? 0);
          }, 0);

          const optimizedRoute = await ctx.db.optimizedRoutePath.create({
            data: {
              routeId: route.routeId,
              vehicleId: route.vehicleId,
              geoJson: route.geoJson,
              distance: totalDistance,
              startTime: route?.stops?.[0]?.arrival,
              endTime: route?.stops?.[route.stops.length - 1]?.departure,
            },
          });

          const stops = route.stops.map((stop) => ({
            ...stop,
            routePathId: optimizedRoute.id,
          }));

          await ctx.db.optimizedStop.createMany({ data: stops });

          return optimizedRoute;
        }),
      );

      const updatedRoute = await ctx.db.route.update({
        where: { id: input.routeId },
        data: { optimizedData: JSON.stringify(input.plan.data) },
      });

      return {
        data: updatedRoute,
        message: "Optimized data has been saved.",
      };
    }),

  updateOptimizedStop: protectedProcedure
    .input(
      z.object({
        stopId: z.string(),
        state: z.nativeEnum(RouteStatus),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const optimizedStop = await ctx.db.optimizedStop.update({
        where: { id: input.stopId },
        data: {
          status: input.state,
          notes: input.notes,
        },
        include: {
          job: {
            include: {
              client: true,
              address: true,
            },
          },
        },
      });

      await pusherServer.trigger(
        "map",
        `evt::invalidate-stops`,
        `Stop at ${optimizedStop?.job?.address?.formatted} was updated to ${input.state}`,
      );

      return {
        data: optimizedStop,
        message: "Stop status was successfully updated.",
      };
    }),

  updateOptimizedPath: protectedProcedure
    .input(
      z.object({
        pathId: z.string(),
        state: z.nativeEnum(RouteStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const optimizedStop = ctx.db.optimizedRoutePath.update({
        where: { id: input.pathId },
        data: { status: input.state },
      });

      await pusherServer.trigger("map", `evt::invalidate-stops`, null);
      await pusherServer.trigger(
        "map",
        `evt::update-route-status`,
        `Route ${input.pathId} status was updated to ${input.state}`,
      );

      return {
        data: optimizedStop,
        message: "Route path was successfully updated.",
      };
    }),

  getOptimizedStopsByAddress: protectedProcedure
    .input(z.object({ address: z.string(), optimizedRouteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const stops = await ctx.db.optimizedStop.findMany({
        where: {
          routePathId: input.optimizedRouteId,
          job: { address: { formatted: input.address } },
        },
        include: {
          job: {
            include: {
              client: true,
              address: true,
            },
          },
        },
      });

      return stops;
    }),
  getOptimized: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: optimizedRoutePathId }) => {
      if (!optimizedRoutePathId) return null;
      return ctx.db.optimizedRoutePath.findUnique({
        where: { id: optimizedRoutePathId },
        include: {
          stops: {
            include: {
              job: {
                include: {
                  client: true,
                },
              },
            },
          },
        },
      });
    }),

  getAll: protectedProcedure
    .input(z.string())
    .query(({ ctx, input: depotId }) => {
      return ctx.db.route.findMany({
        where: { depotId },
      });
    }),

  getAllByDate: protectedProcedure
    .input(
      z.object({
        date: z.date(),
        depotId: z.string(),
      }),
    )
    .query(({ ctx, input }) => {
      const startDate = new Date(input.date.toISOString());
      const endDate = new Date(startDate);

      // Set start time to midnight (00:00:00)
      startDate.setHours(0, 0, 0, 0);

      // Set end time to 11:59:59
      endDate.setHours(23, 59, 59, 999);

      return ctx.db.route.findMany({
        where: {
          deliveryAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          optimizedRoute: true,
          vehicles: {
            include: {
              driver: { include: { address: true } },
              startAddress: true,
            },
          },
          jobs: {
            include: {
              address: true,
              client: true,
            },
          },
        },
      });
    }),

  getStopsByDate: protectedProcedure
    .input(
      z.object({
        date: z.date(),
        depotId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.date.toISOString());
      const endDate = new Date(startDate);

      // Set start time to midnight (00:00:00)
      startDate.setHours(0, 0, 0, 0);

      // Set end time to 11:59:59
      endDate.setHours(23, 59, 59, 999);

      const routes = await ctx.db.route.findMany({
        where: {
          deliveryAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          jobs: {
            include: {
              address: true,
              client: {
                include: {
                  address: true,
                },
              },
            },
          },
        },
      });

      const stops = routes.flatMap((route) => route.jobs);
      const jobBundles = stops.map((job) => ({
        client: job.client,
        job: job,
      }));

      return jobBundles as unknown as ClientJobBundle[];
    }),

  get: protectedProcedure.input(z.string()).query(({ ctx, input: routeId }) => {
    return ctx.db.route.findUnique({
      where: { id: routeId },
      include: {
        vehicles: {
          include: {
            driver: { include: { address: true } },
            startAddress: true,
          },
        },
        jobs: {
          include: {
            address: true,
            client: true,
          },
        },
        optimizedRoute: {
          include: {
            stops: true,
            vehicle: { include: { driver: true } },
          },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        depotId: z.string(),
        date: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.route.create({
        data: {
          depotId: input.depotId,
          deliveryAt: input.date,
        },
      });

      return {
        data: plan,
        message: "Route was successfully created.",
      };
    }),

  setRouteVehicles: protectedProcedure
    .input(
      z.object({ data: z.array(driverVehicleSchema), routeId: z.string() }),
    )
    .mutation(async ({ ctx, input }) => {
      const route = await ctx.db.route.findUnique({
        where: { id: input.routeId },
        include: {
          vehicles: {
            include: {
              endAddress: true,
              driver: { include: { address: true } },
              startAddress: true,
              breaks: true,
            },
          },
        },
      });

      if (route?.vehicles.length) {
        await ctx.db.route.update({
          where: { id: input.routeId },
          data: { vehicles: { deleteMany: {} } },
        });
      }

      const res = await Promise.all(
        input.data.map(async (driverVehicle) => {
          const defaultVehicle = await ctx.db.vehicle.findFirst({
            where: { id: driverVehicle.driver.defaultVehicleId },
            include: {
              breaks: true,
              startAddress: true,
              endAddress: true,
            },
          });

          if (!defaultVehicle)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Default vehicle not found",
            });

          const endAddress = defaultVehicle?.endAddress?.formatted
            ? await ctx.db.address.create({
                data: {
                  formatted: defaultVehicle.endAddress.formatted,
                  latitude: defaultVehicle.endAddress.latitude,
                  longitude: defaultVehicle.endAddress.longitude,
                },
              })
            : {
                id: undefined,
              };

          const vehicle = await ctx.db.vehicle.create({
            data: {
              driverId: driverVehicle.driver.id,
              depotId: route!.depotId,

              startAddress: {
                create: {
                  formatted: defaultVehicle.startAddress!.formatted,
                  latitude: defaultVehicle.startAddress!.latitude,
                  longitude: defaultVehicle.startAddress!.longitude,
                },
              },

              shiftStart:
                defaultVehicle?.shiftStart ?? driverVehicle.vehicle.shiftStart,
              shiftEnd:
                defaultVehicle?.shiftEnd ?? driverVehicle.vehicle.shiftEnd,
              // type: driverVehicle.driver.type,
              capacity:
                defaultVehicle?.capacity ?? driverVehicle.vehicle.capacity,
              maxTasks:
                defaultVehicle?.maxTasks ?? driverVehicle.vehicle.maxTasks,
              maxTravelTime:
                defaultVehicle?.maxTravelTime ??
                driverVehicle.vehicle.maxTravelTime,
              maxDistance:
                defaultVehicle?.maxDistance ??
                driverVehicle.vehicle.maxDistance,
              notes: defaultVehicle?.notes ?? driverVehicle.vehicle.notes ?? "",
              cargo: defaultVehicle?.cargo ?? driverVehicle.vehicle.cargo ?? "",
              breaks: {
                create: (defaultVehicle
                  ? defaultVehicle.breaks
                  : driverVehicle?.vehicle?.breaks
                )?.map((b) => ({
                  duration: b?.duration ?? 1800, //30 minutes in seconds
                  start: b?.start ?? driverVehicle.vehicle.shiftStart,
                  end: b?.end ?? driverVehicle.vehicle.shiftEnd,
                })),
              },
            },
          });

          if (!defaultVehicle?.endAddress) return vehicle;

          return ctx.db.vehicle.update({
            where: { id: vehicle.id },
            data: { endAddress: { connect: { id: endAddress.id } } },
          });
        }),
      );

      const routeVehicles = await ctx.db.route.update({
        where: { id: input.routeId },
        data: { vehicles: { connect: res.map((v) => ({ id: v.id })) } },
      });

      return {
        data: routeVehicles,
        message: "Route drivers were successfully set.",
      };
    }),
});
