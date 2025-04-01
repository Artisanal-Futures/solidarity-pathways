import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";

type CheckIfJobExistsInRouteProps = {
  id: string | null;
  routeJobs: ClientJobBundle[];
};

export const checkIfJobExistsInRoute = ({
  id,
  routeJobs,
}: CheckIfJobExistsInRouteProps): ClientJobBundle | null => {
  if (!id) return null;
  return routeJobs?.find((bundle) => bundle.job.id === id) ?? null;
};

type ClientProps = {
  id: string | null;
  clientBundles: ClientJobBundle[];
};

export const checkIfClientExistsInRoute = ({
  id,
  clientBundles,
}: ClientProps): ClientJobBundle | null => {
  if (!id) return null;
  return clientBundles?.find((bundle) => bundle.client?.id === id) ?? null;
};

type VehicleProps = {
  id: string | null;
  vehicleBundles: DriverVehicleBundle[];
};

export const checkIfVehicleExistsInRoute = ({
  id,
  vehicleBundles,
}: VehicleProps): DriverVehicleBundle | null => {
  if (!id) return null;
  return vehicleBundles?.find((bundle) => bundle.vehicle.id === id) ?? null;
};
