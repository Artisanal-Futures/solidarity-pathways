
import { z } from "zod";


export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});


export const compartmentProductSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  maxCapacity: z.number().min(1, "Max capacity must be at least 1"),
  productId: z.string().optional(),
});


export const levelSchema = z.object({
  id: z.number().int().min(1, "Level ID must be positive"),
  compartments: z.number().int().min(4).max(12, "Compartments must be between 4 and 12"),
  stockStatus: z.enum(['empty', 'low', 'medium', 'full']),
  products: z.record(
    z.string().transform(Number), 
    compartmentProductSchema
  ),
  capacity: z.number().optional(),
  lastRestocked: z.date().optional(),
});


export const vendingMachineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  coordinates: coordinatesSchema,
  address: z.string().optional(),
  inventory: z.record(z.string(), z.number().min(0)).default({}),
});


export const enhancedVendingMachineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  coordinates: coordinatesSchema,
  address: z.string().optional(),
  levels: z.array(levelSchema).optional(),
  metadata: z.object({
    totalLevels: z.number().optional(),
    machineType: z.string().optional(),
    installationDate: z.date().optional(),
    lastMaintenance: z.date().optional(),
  }).optional(),
  inventory: z.record(z.string(), z.number().min(0)).optional(), // 向后兼容
});


export const vendingMachineUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  coordinates: coordinatesSchema.optional(),
  address: z.string().optional(),
  inventory: z.record(z.string(), z.number().min(0)).optional(),
});


export const enhancedVendingMachineUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  coordinates: coordinatesSchema.optional(),
  address: z.string().optional(),
  levels: z.array(levelSchema).optional(),
  metadata: z.object({
    totalLevels: z.number().optional(),
    machineType: z.string().optional(),
    installationDate: z.date().optional(),
    lastMaintenance: z.date().optional(),
  }).optional(),
  inventory: z.record(z.string(), z.number().min(0)).optional(), // 向后兼容
});


export const levelUpdateSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  levelId: z.number().int().min(1, "Level ID must be positive"),
  products: z.record(
    z.string().transform(Number),
    compartmentProductSchema
  ),
});


export const multipleLevelsUpdateSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  levelUpdates: z.array(z.object({
    levelId: z.number().int().min(1),
    products: z.record(
      z.string().transform(Number),
      compartmentProductSchema
    ),
  })).min(1, "At least one level update is required"),
});


export const compartmentUpdateSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  levelId: z.number().int().min(1, "Level ID must be positive"),
  compartmentId: z.number().int().min(1, "Compartment ID must be positive"),
  product: compartmentProductSchema,
});


export const productSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
});


export const inventoryStatsSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  includeDetails: z.boolean().default(false),
});


export const userRoleSchema = z.enum(['operator', 'viewer', 'admin']);


export const permissionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  machineId: z.string().min(1, "Machine ID is required"),
  role: userRoleSchema,
  expiresAt: z.date().optional(),
});


export type VendingMachineInput = z.infer<typeof vendingMachineSchema>;
export type EnhancedVendingMachineInput = z.infer<typeof enhancedVendingMachineSchema>;
export type VendingMachineUpdateInput = z.infer<typeof vendingMachineUpdateSchema>;
export type EnhancedVendingMachineUpdateInput = z.infer<typeof enhancedVendingMachineUpdateSchema>;
export type LevelUpdateInput = z.infer<typeof levelUpdateSchema>;
export type MultipleLevelsUpdateInput = z.infer<typeof multipleLevelsUpdateSchema>;
export type CompartmentUpdateInput = z.infer<typeof compartmentUpdateSchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type InventoryStatsInput = z.infer<typeof inventoryStatsSchema>;
export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type PermissionInput = z.infer<typeof permissionSchema>;


export function validateLevel(level: unknown): level is z.infer<typeof levelSchema> {
  try {
    levelSchema.parse(level);
    return true;
  } catch {
    return false;
  }
}

export function validateCompartmentProduct(product: unknown): product is z.infer<typeof compartmentProductSchema> {
  try {
    compartmentProductSchema.parse(product);
    return true;
  } catch {
    return false;
  }
}


export function sanitizeInventoryData(data: unknown): Record<string, number> {
  if (!data || typeof data !== 'object') return {};
  
  const result: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof key === 'string' && typeof value === 'number' && value >= 0) {
      result[key] = value;
    }
  }
  
  return result;
}

export function sanitizeLevelData(data: unknown): z.infer<typeof levelSchema> | null {
  try {
    return levelSchema.parse(data);
  } catch {
    return null;
  }
}


export function convertLegacyToEnhanced(
  legacy: z.infer<typeof vendingMachineSchema>
): z.infer<typeof enhancedVendingMachineSchema> {
  return {
    ...legacy,
    levels: [], 
  };
}

export function convertEnhancedToLegacy(
  enhanced: z.infer<typeof enhancedVendingMachineSchema>
): z.infer<typeof vendingMachineSchema> {
  return {
    name: enhanced.name,
    coordinates: enhanced.coordinates,
    address: enhanced.address,
    inventory: enhanced.inventory ?? {},
  };
}