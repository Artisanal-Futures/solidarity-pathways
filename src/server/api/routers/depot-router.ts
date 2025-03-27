import { z } from "zod";
import { addressSchema } from "~/schemas.wip";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const depotRouter = createTRPCRouter({
  getDepot: protectedProcedure
    .input(z.object({ depotId: z.string() }))
    .query(async ({ input, ctx }) => {
      const depot = await ctx.db.depot.findFirst({
        where: { id: input.depotId },
        include: { address: true },
      });
      return depot;
    }),

  createDepot: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        address: addressSchema.optional(),
        magicCode: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const depot = await ctx.db.depot.create({
        data: {
          ownerId: ctx.session.user.id,
          name: input.name,
          magicCode: input.magicCode,
        },
      });

      if (!input.address) return depot;

      const address = await ctx.db.address.create({
        data: {
          formatted: input.address.formatted,
          latitude: input.address.latitude,
          longitude: input.address.longitude,
        },
      });

      return ctx.db.depot.update({
        where: {
          id: depot.id,
        },
        data: {
          address: {
            connect: {
              id: address.id,
            },
          },
        },
      });
    }),

  updateDepot: protectedProcedure
    .input(
      z.object({
        depotId: z.string(),
        name: z.string().optional(),
        address: addressSchema.optional(),
        magicCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const depot = await ctx.db.depot.update({
        where: {
          id: input.depotId,
        },
        data: {
          name: input.name,
          magicCode: input.magicCode,
        },
      });

      if (!input.address) return depot;

      const address = await ctx.db.address.upsert({
        where: {
          depotId: depot?.id,
        },
        update: {
          formatted: input.address.formatted,
          latitude: input.address.latitude,
          longitude: input.address.longitude,
        },
        create: {
          formatted: input.address.formatted,
          latitude: input.address.latitude,
          longitude: input.address.longitude,
        },
      });

      return ctx.db.depot.update({
        where: {
          id: input.depotId,
        },
        data: {
          address: {
            connect: {
              id: address.id,
            },
          },
        },
      });
    }),

  deleteDepot: protectedProcedure
    .input(z.object({ depotId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.depot.delete({
        where: {
          id: input.depotId,
        },
      });
    }),
});
