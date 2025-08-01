/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// 完整修复的 server/api/routers/vending-machine.ts
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { vendingMachineSchema, vendingMachineUpdateSchema } from "~/lib/validators/vending-machine";
import { z } from "zod";
import type { 
  VendingMachineLevel, 
  EnhancedVendingMachine, 
  CompartmentProduct
} from "~/types/vendingMachine";
import { 
  convertLegacyInventoryToLevels, 
  convertLevelsToLegacyInventory,
  isValidLevelsData,
  calculateStockStatus
} from "~/types/vendingMachine";

// 层级产品验证 schema
const compartmentProductSchema = z.object({
  productName: z.string(),
  quantity: z.number().min(0),
  maxCapacity: z.number().min(1),
  productId: z.string().optional(),
});

// 层级验证 schema
const levelSchema = z.object({
  id: z.number(),
  compartments: z.number().min(4).max(12),
  stockStatus: z.enum(['empty', 'low', 'medium', 'full']),
  products: z.record(z.coerce.number(), compartmentProductSchema), // 修复：使用 z.coerce.number()
  capacity: z.number().optional(),
  lastRestocked: z.date().optional(),
});

// 层级更新请求 schema
const levelUpdateSchema = z.object({
  machineId: z.string(),
  levelId: z.number(),
  products: z.record(z.coerce.number(), compartmentProductSchema), // 修复：使用 z.coerce.number()
});

// 增强的售货机更新 schema
const enhancedUpdateSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  levels: z.array(levelSchema).optional(),
  inventory: z.record(z.string(), z.number()).optional(), // 向后兼容
});

export const vendingMachineRouter = createTRPCRouter({
  // 1. 获取所有 vending machines (增强版本)
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
        levels: true, // 新字段
        createdAt: true,
        updatedAt: true,
      },
    });

    return machines.map(machine => {
      // 检查是否有新的层级数据
      let levels: VendingMachineLevel[] = [];
      
      if (machine.levels && isValidLevelsData(machine.levels)) {
        levels = machine.levels;
      } else if (machine.inventory) {
        // 如果没有层级数据但有旧的库存数据，则转换
        const legacyInventory = machine.inventory as Record<string, number>;
        levels = convertLegacyInventoryToLevels(legacyInventory);
      }

      const result: EnhancedVendingMachine = {
        id: machine.id,
        name: machine.name,
        coordinates: {
          latitude: machine.latitude,
          longitude: machine.longitude,
        },
        address: machine.address,
        levels,
        // 修复：将 Date 转换为 string
        createdAt: machine.createdAt.toISOString(),
        updatedAt: machine.updatedAt.toISOString(),
      };

      return result;
    });
  }),

  // 2. 获取单个 vending machine (增强版本)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const machine = await ctx.db.vendingMachine.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          address: true,
          inventory: true,
          levels: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!machine) throw new Error("Vending machine not found");

      // 处理层级数据
      let levels: VendingMachineLevel[] = [];
      
      if (machine.levels && isValidLevelsData(machine.levels)) {
        levels = machine.levels;
      } else if (machine.inventory) {
        const legacyInventory = machine.inventory as Record<string, number>;
        levels = convertLegacyInventoryToLevels(legacyInventory);
      }

      return {
        id: machine.id,
        name: machine.name,
        coordinates: {
          latitude: machine.latitude,
          longitude: machine.longitude,
        },
        address: machine.address,
        levels,
        // 修复：将 Date 转换为 string
        createdAt: machine.createdAt.toISOString(),
        updatedAt: machine.updatedAt.toISOString(),
      } as EnhancedVendingMachine;
    }),

  // 3. 新建 vending machine (兼容旧版本)
  create: publicProcedure
    .input(vendingMachineSchema)
    .mutation(async ({ ctx, input }) => {
      const { coordinates, ...rest } = input;
      
      // 如果提供了库存数据，转换为层级格式
      const levels = rest.inventory 
        ? convertLegacyInventoryToLevels(rest.inventory)
        : [];

      const newMachine = await ctx.db.vendingMachine.create({
        data: {
          ...rest,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          levels: levels, // 存储层级数据
        },
      });

      return {
        id: newMachine.id,
        name: newMachine.name,
        coordinates: {
          latitude: newMachine.latitude,
          longitude: newMachine.longitude,
        },
        address: newMachine.address,
        inventory: newMachine.inventory as Record<string, number>,
        // 修复：将 Date 转换为 string
        createdAt: newMachine.createdAt.toISOString(),
        updatedAt: newMachine.updatedAt.toISOString(),
      };
    }),

  // 4. 更新 vending machine (增强版本)
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: enhancedUpdateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;
      
      const updateData: any = {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.coordinates && {
          latitude: data.coordinates.latitude,
          longitude: data.coordinates.longitude,
        }),
      };

      // 处理层级或库存数据
      if (data.levels) {
        updateData.levels = data.levels;
        // 同时更新旧的inventory字段以保持兼容性
        updateData.inventory = convertLevelsToLegacyInventory(data.levels);
      } else if (data.inventory) {
        updateData.inventory = data.inventory;
        updateData.levels = convertLegacyInventoryToLevels(data.inventory);
      }

      const updated = await ctx.db.vendingMachine.update({
        where: { id },
        data: updateData,
      });

      return {
        id: updated.id,
        name: updated.name,
        coordinates: {
          latitude: updated.latitude,
          longitude: updated.longitude,
        },
        address: updated.address,
        inventory: updated.inventory as Record<string, number>,
        // 修复：将 Date 转换为 string
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }),

  // 5. 更新特定层级
  updateLevel: publicProcedure
    .input(levelUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { machineId, levelId, products } = input;

      // 获取当前机器数据
      const machine = await ctx.db.vendingMachine.findUnique({
        where: { id: machineId },
        select: { levels: true, inventory: true },
      });

      if (!machine) throw new Error("Vending machine not found");

      // 获取当前层级数据
      let currentLevels: VendingMachineLevel[] = [];
      
      if (machine.levels && isValidLevelsData(machine.levels)) {
        currentLevels = machine.levels;
      } else if (machine.inventory) {
        const legacyInventory = machine.inventory as Record<string, number>;
        currentLevels = convertLegacyInventoryToLevels(legacyInventory);
      }

      // 更新指定层级
      const updatedLevels = currentLevels.map(level => {
        if (level.id === levelId) {
          const updatedLevel: VendingMachineLevel = {
            ...level,
            products,
            stockStatus: calculateStockStatus(products),
          };
          return updatedLevel;
        }
        return level;
      });

      // 如果层级不存在，创建新层级
      if (!currentLevels.find(level => level.id === levelId)) {
        const compartmentCount = Object.keys(products).length;
        const newLevel: VendingMachineLevel = {
          id: levelId,
          compartments: compartmentCount,
          stockStatus: calculateStockStatus(products),
          products,
        };
        updatedLevels.push(newLevel);
        updatedLevels.sort((a, b) => b.id - a.id); // 按层级编号倒序排列
      }

      // 更新数据库
      const updated = await ctx.db.vendingMachine.update({
        where: { id: machineId },
        data: {
          levels: updatedLevels,
          inventory: convertLevelsToLegacyInventory(updatedLevels), // 保持兼容性
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        coordinates: {
          latitude: updated.latitude,
          longitude: updated.longitude,
        },
        address: updated.address,
        inventory: updated.inventory as Record<string, number>,
        // 修复：将 Date 转换为 string
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }),

  // 6. 获取特定层级信息
  getLevel: publicProcedure
    .input(z.object({
      machineId: z.string(),
      levelId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { machineId, levelId } = input;

      const machine = await ctx.db.vendingMachine.findUnique({
        where: { id: machineId },
        select: { levels: true, inventory: true },
      });

      if (!machine) throw new Error("Vending machine not found");

      let levels: VendingMachineLevel[] = [];
      
      if (machine.levels && isValidLevelsData(machine.levels)) {
        levels = machine.levels;
      } else if (machine.inventory) {
        const legacyInventory = machine.inventory as Record<string, number>;
        levels = convertLegacyInventoryToLevels(legacyInventory);
      }

      const level = levels.find(l => l.id === levelId);
      if (!level) throw new Error("Level not found");

      return level;
    }),

  // 7. 获取机器库存统计
  getInventoryStats: publicProcedure
    .input(z.object({ machineId: z.string() }))
    .query(async ({ ctx, input }) => {
      const machine = await ctx.db.vendingMachine.findUnique({
        where: { id: input.machineId },
        select: { levels: true, inventory: true, name: true },
      });

      if (!machine) throw new Error("Vending machine not found");

      let levels: VendingMachineLevel[] = [];
      
      if (machine.levels && isValidLevelsData(machine.levels)) {
        levels = machine.levels;
      } else if (machine.inventory) {
        const legacyInventory = machine.inventory as Record<string, number>;
        levels = convertLegacyInventoryToLevels(legacyInventory);
      }

      // 计算统计信息
      const stats = {
        machineName: machine.name,
        totalLevels: levels.length,
        totalCompartments: levels.reduce((sum, level) => sum + level.compartments, 0),
        stockStatus: {
          empty: levels.filter(l => l.stockStatus === 'empty').length,
          low: levels.filter(l => l.stockStatus === 'low').length,
          medium: levels.filter(l => l.stockStatus === 'medium').length,
          full: levels.filter(l => l.stockStatus === 'full').length,
        },
        totalProducts: levels.reduce((sum, level) => {
          return sum + Object.values(level.products).reduce((levelSum, product) => {
            return levelSum + product.quantity;
          }, 0);
        }, 0),
        totalCapacity: levels.reduce((sum, level) => {
          return sum + Object.values(level.products).reduce((levelSum, product) => {
            return levelSum + product.maxCapacity;
          }, 0);
        }, 0),
      };

      const fillRate = stats.totalCapacity > 0 ? (stats.totalProducts / stats.totalCapacity) * 100 : 0;

      return {
        ...stats,
        fillRate: Math.round(fillRate * 100) / 100,
      };
    }),

  // 8. 批量更新多个层级
  updateMultipleLevels: publicProcedure
    .input(z.object({
      machineId: z.string(),
      levelUpdates: z.array(z.object({
        levelId: z.number(),
        products: z.record(z.coerce.number(), compartmentProductSchema),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { machineId, levelUpdates } = input;

      const machine = await ctx.db.vendingMachine.findUnique({
        where: { id: machineId },
        select: { levels: true, inventory: true },
      });

      if (!machine) throw new Error("Vending machine not found");

      let currentLevels: VendingMachineLevel[] = [];
      
      if (machine.levels && isValidLevelsData(machine.levels)) {
        currentLevels = machine.levels;
      } else if (machine.inventory) {
        const legacyInventory = machine.inventory as Record<string, number>;
        currentLevels = convertLegacyInventoryToLevels(legacyInventory);
      }

      // 应用所有更新
      const updatedLevels = currentLevels.map(level => {
        const update = levelUpdates.find(u => u.levelId === level.id);
        if (update) {
          return {
            ...level,
            products: update.products,
            stockStatus: calculateStockStatus(update.products),
          };
        }
        return level;
      });

      // 更新数据库
      const updated = await ctx.db.vendingMachine.update({
        where: { id: machineId },
        data: {
          levels: updatedLevels,
          inventory: convertLevelsToLegacyInventory(updatedLevels),
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        coordinates: {
          latitude: updated.latitude,
          longitude: updated.longitude,
        },
        address: updated.address,
        inventory: updated.inventory as Record<string, number>,
        // 修复：将 Date 转换为 string
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }),

  // 9. 删除 vending machine (保持原有)
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.vendingMachine.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // 10. 产品搜索功能 (新增)
  searchProducts: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const { query, limit } = input;
      
      // 模拟产品数据库 - 在实际应用中这应该是真实的产品数据
      const mockProducts = [
        { id: '1', name: 'Coca Cola', category: 'Beverages' },
        { id: '2', name: 'Pepsi', category: 'Beverages' },
        { id: '3', name: 'Sprite', category: 'Beverages' },
        { id: '4', name: 'Water', category: 'Beverages' },
        { id: '5', name: 'Coffee', category: 'Hot Drinks' },
        { id: '6', name: 'Tea', category: 'Hot Drinks' },
        { id: '7', name: 'Orange Juice', category: 'Beverages' },
        { id: '8', name: 'Apple Juice', category: 'Beverages' },
        { id: '9', name: 'Chips', category: 'Snacks' },
        { id: '10', name: 'Cookies', category: 'Snacks' },
        { id: '11', name: 'Candy Bar', category: 'Snacks' },
        { id: '12', name: 'Nuts', category: 'Snacks' },
      ];

      const filteredProducts = mockProducts
        .filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.category.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit);

      return filteredProducts;
    }),
});