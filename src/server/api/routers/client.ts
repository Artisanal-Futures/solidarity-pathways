import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import { clientSchema } from "~/lib/validators/client-job";

export const clientRouterAlt = createTRPCRouter({
  update: protectedProcedure
    .input(
      z.object({
        depotId: z.string(),
        client: clientSchema,
        jobId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { address, ...clientData } = input.client;
      const client = await ctx.db.client.upsert({
        where: { email: input.client.email },
        update: {
          ...(address
            ? {
                address: {
                  upsert: {
                    update: { ...address },
                    create: { ...address },
                  },
                },
              }
            : {}),
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email,
          depotId: input.depotId,
        },
        create: {
          ...(address
            ? {
                address: {
                  create: { ...address },
                },
              }
            : {}),
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email,
          depotId: input.depotId,
        },
        include: { address: true },
      });

      if (input.jobId) {
        await ctx.db.job.update({
          where: { id: input.jobId },
          data: { clientId: client.id },
        });
      }
      return {
        data: client,
        message: "Client was successfully updated.",
      };
    }),

  getAll: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: depotId }) => {
      const clients = await ctx.db.client.findMany({
        where: { depotId },
        include: {
          address: true,
          jobs: true,
        },
      });

      return clients ?? [];
    }),

  deleteAllFromDepot: protectedProcedure
    .input(z.object({ depotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const clients = await ctx.db.client.deleteMany({
        where: { depotId: input.depotId },
      });

      return {
        data: clients,
        message: "Clients deleted!",
      };
    }),
});
