/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-inferrable-types */
//types/vendingMachine.ts
import type { Prisma } from "@prisma/client";
import type { Coordinates } from "./geolocation";

// Use Prisma.JsonValue type correctly
type PrismaJson = Prisma.JsonValue;

export type CompartmentProduct = {
  productName: string;
  quantity: number;
  maxCapacity: number;
  productId?: string;
};

export type VendingMachineLevel = {
  id: number;
  compartments: number;
  stockStatus: 'empty' | 'low' | 'medium' | 'full';
  products: Record<number, CompartmentProduct>;
  capacity?: number;
  lastRestocked?: string | null;
};

export type EnhancedVendingMachine = VendingMachine &{
  levels: VendingMachineLevel[];
  metadata?: {
    totalLevels: number;
    machineType: string;
    installationDate?: string | null;
    lastMaintenance?: string | null;
  };
};

export type VendingMachine = {
  id: string;
  name?: string | null;
  coordinates: Coordinates;
  address?: string | null;
  inventory: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

export type VendingMachineUpdateRequest = {
  name?: string;
  address?: string;
  coordinates?: Coordinates;
  levels?: VendingMachineLevel[];
  inventory?: Record<string, number>;
};

export type LevelUpdateRequest = {
  machineId: string;
  levelId: number;
  products: Record<number, CompartmentProduct>;
};

export enum UserRole {
  OPERATOR = 'operator',
  VIEWER = 'viewer',
  ADMIN = 'admin'
}

export function calculateStockStatus(products: Record<number, CompartmentProduct>): 'empty' | 'low' | 'medium' | 'full' {
  const compartments = Object.values(products);
  if (compartments.length === 0) return 'empty';
  
  const avgFillRate = compartments.reduce((sum, product) => {
    return sum + (product.quantity / product.maxCapacity);
  }, 0) / compartments.length;
  
  if (avgFillRate < 0.1) return 'empty';
  if (avgFillRate < 0.3) return 'low';
  if (avgFillRate < 0.7) return 'medium';
  return 'full';
}

export function convertLegacyInventoryToLevels(
  inventory: Record<string, number>,
  defaultLevels: number = 8,
  defaultCompartmentsPerLevel: number = 6
): VendingMachineLevel[] {
  const levels: VendingMachineLevel[] = [];
  const products = Object.entries(inventory);
  
  for (let levelId = defaultLevels; levelId >= 1; levelId--) {
    const levelProducts: Record<number, CompartmentProduct> = {};
    

    for (let compartment = 1; compartment <= defaultCompartmentsPerLevel; compartment++) {
      const productIndex = (defaultLevels - levelId) * defaultCompartmentsPerLevel + (compartment - 1);
      const productEntry = products[productIndex];
      
      if (productEntry) {
        const [productName, quantity] = productEntry;
        levelProducts[compartment] = {
          productName,
          quantity,
          maxCapacity: 20
        };
      } else {
        levelProducts[compartment] = {
          productName: '',
          quantity: 0,
          maxCapacity: 20
        };
      }
    }
    
    levels.push({
      id: levelId,
      compartments: defaultCompartmentsPerLevel,
      stockStatus: calculateStockStatus(levelProducts),
      products: levelProducts
    });
  }
  
  return levels;
}

export function convertLevelsToLegacyInventory(levels: VendingMachineLevel[]): Record<string, number> {
  const inventory: Record<string, number> = {};
  
  levels.forEach(level => {
    Object.values(level.products).forEach(product => {
      if (product.productName && product.quantity > 0) {
        inventory[product.productName] = (inventory[product.productName] ?? 0) + product.quantity;
      }
    });
  });
  
  return inventory;
}

// Type guard functions
export function isEnhancedVendingMachine(machine: unknown): machine is EnhancedVendingMachine {
  return typeof machine === 'object' && 
         machine !== null && 
         'levels' in machine && 
         Array.isArray(machine.levels);
}

export function isValidLevel(level: unknown): level is VendingMachineLevel {
  return typeof level === 'object' && 
         level !== null &&
         'id' in level && 
         typeof level.id === 'number' && 
         'compartments' in level &&
         typeof level.compartments === 'number' && 
         'products' in level &&
         typeof level.products === 'object';
}

// Type guard with correct Prisma JSON type
export function isValidInventory(json: PrismaJson): json is Record<string, number> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return false;
  return Object.values(json).every(val => typeof val === "number");
}

export function isValidLevelsData(json: PrismaJson): json is VendingMachineLevel[] {
  if (!Array.isArray(json)) return false;
  return json.every(item => isValidLevel(item));
}