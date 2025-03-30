import { addressSchema } from "~/schemas.wip";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import { depotFormSchema } from "~/lib/validators/depot";

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

  create: protectedProcedure
    .input(depotFormSchema)
    .mutation(async ({ ctx, input }) => {
      let address;

      if (
        input.address.formatted &&
        input.address.latitude &&
        input.address.longitude
      ) {
        address = await ctx.db.address.create({
          data: {
            formatted: input.address.formatted,
            latitude: input.address.latitude,
            longitude: input.address.longitude,
          },
        });
      }

      const depot = await ctx.db.depot.create({
        data: {
          ownerId: ctx.session.user.id,
          name: input.name,
          magicCode: input.magicCode,
          address: address ? { connect: { id: address.id } } : undefined,
        },
      });

      return {
        data: depot,
        message: "Depot created successfully",
      };
    }),

  update: protectedProcedure
    .input(depotFormSchema.extend({ depotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const depot = await ctx.db.depot.update({
        where: { id: input.depotId },
        data: {
          name: input.name,
          magicCode: input.magicCode,
        },
      });

      if (
        input.address.formatted &&
        input.address.latitude &&
        input.address.longitude
      ) {
        await ctx.db.address.upsert({
          where: { depotId: depot?.id },
          update: {
            formatted: input.address.formatted,
            latitude: input.address.latitude,
            longitude: input.address.longitude,
          },
          create: {
            depotId: depot?.id,
            formatted: input.address.formatted,
            latitude: input.address.latitude,
            longitude: input.address.longitude,
          },
        });
      }

      return {
        data: depot,
        message: "Depot updated successfully",
      };
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input: depotId, ctx }) => {
      const depot = await ctx.db.depot.delete({
        where: { id: depotId },
      });

      return {
        data: depot,
        message: "Depot deleted successfully",
      };
    }),
});
