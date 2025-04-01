import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

import { depotFormSchema } from "~/lib/validators/depot";

export const depotRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.string())
    .query(async ({ input: depotId, ctx }) => {
      const depot = await ctx.db.depot.findFirst({
        where: { id: depotId },
        include: { address: true },
      });
      return depot;
    }),

  create: protectedProcedure
    .input(depotFormSchema)
    .mutation(async ({ ctx, input }) => {
      let address;

      if (input.address) {
        address = await ctx.db.address.create({
          data: { ...input.address },
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

      if (input.address) {
        await ctx.db.address.upsert({
          where: { depotId: depot?.id },
          update: { ...input.address },
          create: { depotId: depot?.id, ...input.address },
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
