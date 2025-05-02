import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { vendingMachineSchema, vendingMachineUpdateSchema } from "~/lib/validators/vending-machine";
import { z } from "zod";

export const vendingMachineRouter = createTRPCRouter({
  // 1. 获取所有 vending machines
  getAll: publicProcedure.query(async ({ ctx }) => {
    const machines = await ctx.db.vendingMachine.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        inventory: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return machines.map(machine => ({
      id: machine.id,
      name: machine.name,
      coordinates: {
        latitude: machine.latitude,
        longitude: machine.longitude,
      },
      address: machine.address,
      inventory: machine.inventory as Record<string, number>,
      createdAt: machine.createdAt,
      updatedAt: machine.updatedAt,
    }));
  }),

  // 2. 获取单个 vending machine
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const machine = await ctx.db.vendingMachine.findUnique({
      where: { id: input.id },
    });

    if (!machine) throw new Error("Vending machine not found");

    return {
      id: machine.id,
      name: machine.name,
      coordinates: {
        latitude: machine.latitude,
        longitude: machine.longitude,
      },
      address: machine.address,
      inventory: machine.inventory as Record<string, number>,
      createdAt: machine.createdAt,
      updatedAt: machine.updatedAt,
    };
  }),

  // 3. 新建 vending machine
  create: publicProcedure.input(vendingMachineSchema).mutation(async ({ ctx, input }) => {
    const { coordinates, ...rest } = input;
    const newMachine = await ctx.db.vendingMachine.create({
      data: {
        ...rest,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    });

    return newMachine;
  }),

  // 4. 更新 vending machine
  update: publicProcedure.input(z.object({
    id: z.string(),
    data: vendingMachineUpdateSchema,
  })).mutation(async ({ ctx, input }) => {
    const { id, data } = input;
    const updateData = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.inventory !== undefined && { inventory: data.inventory }),
      ...(data.coordinates && {
        latitude: data.coordinates.latitude,
        longitude: data.coordinates.longitude,
      }),
    };

    const updated = await ctx.db.vendingMachine.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }),

  // 5. 删除 vending machine
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db.vendingMachine.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),
});