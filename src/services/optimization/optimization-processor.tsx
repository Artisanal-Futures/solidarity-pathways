import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import type { OptimizedResponseData } from "~/types/optimized";

export interface OptimizationProcessor<T, Data, Drivers, Jobs, ResponseData> {
  calculateOptimalPaths(data: T): Promise<Data>;
  formatDriverData(data: DriverVehicleBundle[]): Drivers[];
  formatClientData(data: ClientJobBundle[]): Jobs[];
  formatResponseData(data: ResponseData): OptimizedResponseData;
}

export class OptimizationService<T, Data, Drivers, Jobs, ResponseData> {
  constructor(
    private optimizationProcessor: OptimizationProcessor<
      T,
      Data,
      Drivers,
      Jobs,
      ResponseData
    >,
  ) {}

  async calculateOptimalPaths(data: T): Promise<Data> {
    return this.optimizationProcessor.calculateOptimalPaths(data);
  }
  formatDriverData(data: DriverVehicleBundle[]): Drivers[] {
    return this.optimizationProcessor.formatDriverData(data);
  }
  formatClientData(data: ClientJobBundle[]): Jobs[] {
    return this.optimizationProcessor.formatClientData(data);
  }
  formatResponseData(data: ResponseData): OptimizedResponseData {
    return this.optimizationProcessor.formatResponseData(data);
  }
}
