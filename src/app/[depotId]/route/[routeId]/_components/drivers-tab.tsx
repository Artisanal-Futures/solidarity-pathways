import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { ScrollArea } from "~/components/ui/scroll-area";

import { DriverCard } from "./driver-card";
import { DriverVehicleSheetBtn } from "./driver-vehicle-sheet-btn";

export const DriversTab = () => {
  const { routeId } = useSolidarityState();

  const getRouteVehicles = api.routePlan.getVehicleBundles.useQuery(
    { routeId: routeId },
    { enabled: !!routeId },
  );
  if (getRouteVehicles.isPending) return null;

  return (
    <>
      <div className="flex flex-col px-4">
        <div className="flex items-center justify-between">
          <h2 className="flex scroll-m-20 gap-3 text-xl font-semibold tracking-tight">
            Drivers{" "}
            <span className="rounded-lg border border-slate-300 px-2 text-base">
              {getRouteVehicles?.data?.length ?? 0}
            </span>
          </h2>

          <DriverVehicleSheetBtn />
        </div>

        {getRouteVehicles.data?.length === 0 && (
          <p className="pb-4 pt-2 text-sm text-muted-foreground">
            No drivers have been added to this route yet.
          </p>
        )}
      </div>

      {!getRouteVehicles.isPending && getRouteVehicles.data && (
        <ScrollArea className="px-4">
          {getRouteVehicles.data.length > 0 &&
            getRouteVehicles.data.map((bundle) => (
              <DriverCard
                key={bundle?.vehicle.id}
                id={bundle?.vehicle.id}
                name={bundle.driver?.name ?? "New Driver"}
              />
            ))}
        </ScrollArea>
      )}
    </>
  );
};
