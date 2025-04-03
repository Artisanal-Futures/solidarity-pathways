import { clientJobDataForNewLatLng } from "~/data/stop-data";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import type {
  ClientJobBundle,
  NewClientJobBundle,
} from "~/lib/validators/client-job";
import { jobSchema, newClientJobSchema } from "~/lib/validators/client-job";

export const jobRouter = createTRPCRouter({
  // Batch create jobs (and possibly clients) for a route

  getBundles: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: routeId }) => {
      const data = await ctx.db.job.findMany({
        where: { routeId },
        include: {
          address: true,
          client: { include: { address: true } },
        },
      });
      const bundles = data.map((job) => ({
        client: job.client,
        job: job,
      })) as ClientJobBundle[];

      return bundles ?? [];
    }),

  getBundleById: protectedProcedure
    .input(z.object({ jobId: z.string(), routeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.db.job.findFirst({
        where: {
          id: input.jobId,
          routeId: input.routeId,
        },
        include: {
          address: true,
          client: { include: { address: true } },
        },
      });

      return {
        client: data?.client,
        job: data,
      } as ClientJobBundle;
    }),

  deleteMany: protectedProcedure
    .input(z.object({ jobIds: z.array(z.string()), routeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const jobs = await ctx.db.job.deleteMany({
        where: { id: { in: input.jobIds }, routeId: input.routeId },
      });

      return {
        data: jobs,
        message: "Jobs were successfully deleted from route.",
      };
    }),
  createMany: protectedProcedure
    .input(
      z.object({
        bundles: z.array(newClientJobSchema),
        depotId: z.string(),
        routeId: z.string().optional(),
        date: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let route;

      if (input.routeId) {
        route = await ctx.db.route.findUnique({
          where: { id: input.routeId },
        });
      } else {
        route = await ctx.db.route.create({
          data: {
            depotId: input.depotId,
            deliveryAt: input.date ?? new Date(),
          },
        });
      }

      const bundlesWithClients = input.bundles.map((job) => ({
        job: job.job,
        client: job.client?.email ? job.client : undefined,
      }));

      const res = await Promise.all(
        bundlesWithClients.map(async (clientJob) => {
          const job = await createJob({
            db: ctx.db,
            clientJob,
            depotId: input.depotId,
            routeId: route?.id ?? input.routeId,
          });

          return job;
        }),
      );

      return {
        data: res,
        route: route?.id ?? input.routeId,
        message: "Jobs were successfully added to route.",
      };
    }),

  createByLatLng: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        depotId: z.string(),
        routeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clientJob = clientJobDataForNewLatLng(
        input.latitude,
        input.longitude,
      );

      const job = await createJob({
        db: ctx.db,
        clientJob: {
          job: clientJob.job,
          client: clientJob?.client?.email ? clientJob?.client : undefined,
        },
        depotId: input.depotId,
        routeId: input.routeId,
      });

      return {
        data: job,
        message: "Job was successfully created via lat/lng.",
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        bundle: newClientJobSchema,
        depotId: z.string(),
        routeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = await createJob({
        db: ctx.db,
        clientJob: input.bundle,
        depotId: input.depotId,
        routeId: input.routeId,
      });

      return {
        data: job,
        message: "Job was successfully created.",
      };
    }),

  duplicateToRoute: protectedProcedure
    .input(
      z.object({
        bundleIds: z.array(z.string()),
        depotId: z.string(),
        routeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await Promise.all(
        input.bundleIds.map(async (clientJob) => {
          // Then create the job itself

          const pastJob = await ctx.db.job.findUnique({
            where: { id: clientJob },
            select: {
              address: true,
              client: true,
              timeWindowStart: true,
              timeWindowEnd: true,
              serviceTime: true,
              prepTime: true,
              priority: true,
              type: true,
              notes: true,
              order: true,
            },
          });

          if (!pastJob) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Something happened while creating the jobs and clients",
            });
          }

          const { address, client: clientData, ...pastJobData } = pastJob;
          const job = await ctx.db.job.create({
            data: {
              depotId: input.depotId,
              routeId: input.routeId,
              address: { create: { ...address! } },
              ...pastJobData,
            },
            include: {
              address: true,
            },
          });

          const clientAddress =
            clientData?.email !== undefined &&
            clientData?.email !== "" &&
            clientData?.email !== null
              ? await ctx.db.address.create({ data: { ...address! } })
              : { id: undefined };

          // Next, check if client exists via email. If it does, assume updated info,
          // otherwise create a new client and link with new job
          // If no client info is provided, just create the job
          const client =
            clientData?.email !== undefined &&
            clientData?.email !== "" &&
            clientData?.email !== null
              ? await ctx.db.client.upsert({
                  where: { email: clientData.email },
                  update: {},
                  create: {
                    address: { connect: { id: clientAddress.id } },
                    name: clientData.name,
                    phone: clientData.phone,
                    email: clientData.email,
                    depotId: input.depotId,
                  },
                  include: { address: true },
                })
              : { id: undefined };

          await ctx.db.job.update({
            where: { id: job.id },
            data: { clientId: client.id },
          });

          return {
            data: { client, job } as ClientJobBundle,
            message: "Job(s) successfully duplicated to route.",
          };
        }),
      );

      return {
        data: res,
        message: "Jobs were successfully added to route.",
      };
    }),

  update: protectedProcedure
    .input(z.object({ routeId: z.string(), job: jobSchema }))
    .mutation(async ({ ctx, input }) => {
      const { address, ...jobData } = input.job;

      const job = await ctx.db.job.update({
        where: {
          id: jobData.id,
          routeId: input.routeId,
        },
        data: {
          clientId: jobData.clientId,
          address: {
            upsert: {
              update: { ...address },
              create: { ...address },
            },
          },
          timeWindowStart: jobData.timeWindowStart,
          timeWindowEnd: jobData.timeWindowEnd,
          serviceTime: jobData.serviceTime,
          prepTime: jobData.prepTime,
          priority: jobData.priority,
          type: jobData.type,
          notes: jobData.notes,
          order: jobData.order,
        },
      });

      return {
        data: job,
        message: "Job was successfully updated.",
      };
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: jobId }) => {
      const job = await ctx.db.job.delete({
        where: { id: jobId },
      });

      return {
        data: job,
        message: "Job successfully removed from route.",
      };
    }),

  search: protectedProcedure
    .input(z.object({ depotId: z.string(), queryString: z.string() }))
    .query(async ({ ctx, input }) => {
      const queryString = input.queryString.toLowerCase();

      if (queryString === "") return [];

      const jobs = await ctx.db.job.findMany({
        where: {
          depotId: input.depotId,
          OR: [
            { notes: { contains: queryString } },
            { order: { contains: queryString } },
            { client: { name: { contains: queryString } } },
            { client: { email: { contains: queryString } } },
            { client: { address: { formatted: { contains: queryString } } } },
            { address: { formatted: { contains: queryString } } },
            { client: { phone: { contains: queryString } } },
          ],
        },
        include: {
          client: { include: { address: true } },
          address: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return jobs;
    }),
});

const createJob = async ({
  db,
  clientJob,
  depotId,
  routeId,
}: {
  db: PrismaClient;
  clientJob: NewClientJobBundle;
  depotId: string;
  routeId: string | undefined;
}) => {
  const { address, ...jobData } = clientJob.job;

  const job = await db.job.create({
    data: {
      depotId,
      routeId,
      address: { create: { ...address } },
      ...jobData,
    },
    include: { address: true },
  });

  /**  TODO: So I don't remember why we are not setting this as the client address.
           Maybe it is because the client address and job address would be the same in most instances?*/
  const addressOfClient = clientJob?.job?.address
    ? await db.address.create({ data: { ...address } })
    : { id: undefined };

  // Next, check if client exists via email. If it does, assume updated info,
  // otherwise create a new client and link with new job
  // If no client info is provided, just create the job
  const client = clientJob?.client
    ? await db.client.upsert({
        where: { email: clientJob.client.email },
        update: {},
        create: {
          ...clientJob?.client,
          address: { connect: { id: addressOfClient.id } },
          depotId,
        },
        include: { address: true },
      })
    : { id: undefined };

  await db.job.update({
    where: { id: job.id },
    data: { clientId: client.id },
  });

  return { client, job } as ClientJobBundle;
};
