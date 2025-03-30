import type { FC } from "react";
import { useState } from "react";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { api } from "~/trpc/react";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/map-sheet";
import { DriverForm } from "~/app/[depotId]/_components/form-driver-vehicle/driver-form";

import { DriverDepotDataTable } from "./driver-depot-data-table";
import { DriverSheetDescription } from "./driver-vehicle-sheet-description";

type Props = { standalone?: boolean };

export const DriverVehicleSheet: FC<Props> = ({ standalone }) => {
  const { sessionStatus, routeId, depotId, depotMode } = useSolidarityState();
  const {
    active: activeDriver,
    overrideCurrentRoutes,
    isSheetOpen,
    onSheetOpenChange,
  } = useDriverVehicleBundles();

  const getRouteVehicles = api.routePlan.getVehicleBundles.useQuery(
    { routeId: routeId },
    { enabled: !!routeId },
  );

  const getDepotDrivers = api.drivers.getDepotDrivers.useQuery(
    { depotId },
    { enabled: !!depotId && depotMode !== "calculate" },
  );

  const [selectedData, setSelectedData] = useState<DriverVehicleBundle[]>([]);
  const [tabValue, setTabValue] = useState<string>("depotDrivers");

  const title = activeDriver ? `${activeDriver.driver.name}` : "Manage Drivers";

  const areDepotOptionsVisible =
    activeDriver === null && sessionStatus === "authenticated" && !standalone;

  const areStorageOptionsVisible =
    activeDriver !== null || sessionStatus === "unauthenticated" || standalone;

  const assignVehiclesToRoute = () => {
    overrideCurrentRoutes.mutate({
      data: selectedData,
      routeId,
    });
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetContent
        side={"left"}
        className="radix-dialog-content flex w-full max-w-full flex-col sm:w-full sm:max-w-full md:max-w-md lg:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="text-center text-xl md:text-left">
            {title}
          </SheetTitle>
          <DriverSheetDescription activeVehicle={activeDriver} />
        </SheetHeader>

        {/* Option 1: user is not logged in, can still add via session state */}

        {sessionStatus === "loading" && <p>Loading...</p>}

        {areDepotOptionsVisible && (
          <>
            <Tabs
              defaultValue="depotDrivers"
              className="w-full"
              value={tabValue}
              onValueChange={setTabValue}
            >
              <TabsList className="flex w-full items-center justify-between">
                <TabsTrigger value="depotDrivers" className="flex-1">
                  Add Existing
                </TabsTrigger>
                <TabsTrigger value="newDriver" className="flex-1">
                  Create New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="depotDrivers">
                <Button
                  className="my-3 w-full p-4"
                  onClick={assignVehiclesToRoute}
                >
                  Update route drivers
                </Button>

                <DriverDepotDataTable
                  storeData={getRouteVehicles?.data ?? []}
                  data={getDepotDrivers?.data ?? []}
                  setSelectedData={setSelectedData}
                />
              </TabsContent>
              <TabsContent value="newDriver">
                <DriverForm
                  handleOnOpenChange={onSheetOpenChange}
                  activeDriver={activeDriver}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Option 2: use is logged in and allows for user to select existing drivers
          as well as add new drivers to the database
        */}
        {areStorageOptionsVisible && (
          <DriverForm
            handleOnOpenChange={onSheetOpenChange}
            activeDriver={activeDriver}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
