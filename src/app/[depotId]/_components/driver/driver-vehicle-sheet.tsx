"use client";

import type { FC } from "react";
import { useState } from "react";
import { useDriver } from "~/providers/driver";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { api } from "~/trpc/react";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/map-sheet";
import { DataTable } from "~/app/_components/data-sheet/data-table";
import { DriverForm } from "~/app/[depotId]/_components/driver/driver-form";

import { driverDepotColumns } from "./driver-depot-columns";
import { DriverSheetDescription } from "./driver-vehicle-sheet-description";

type Props = { standalone?: boolean };

export const DriverVehicleSheet: FC<Props> = ({ standalone }) => {
  const { sessionStatus, routeId, depotId, depotMode } = useSolidarityState();

  const {
    activeDriverData,
    closeDriverEdit,
    isDriverSheetOpen,
    onSheetOpenChange,
  } = useDriver();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "routePlan"],
  });

  const overrideCurrentRoutes = api.routePlan.setRouteVehicles.useMutation({
    ...defaultActions,
    onSettled: () => {
      defaultActions.onSettled();
      closeDriverEdit();
    },
  });

  const getRouteVehicles = api.routePlan.getVehicleBundles.useQuery(
    { routeId },
    { enabled: !!routeId },
  );

  const getDepotDrivers = api.driver.getAll.useQuery(depotId, {
    enabled: !!depotId && depotMode !== "calculate",
  });

  const [selectedData, setSelectedData] = useState<DriverVehicleBundle[]>([]);
  const [tabValue, setTabValue] = useState<string>("depotDrivers");

  const title = activeDriverData
    ? `${activeDriverData.driver.name}`
    : "Manage Drivers";

  const areDepotOptionsVisible = activeDriverData === null && !standalone;

  const areStorageOptionsVisible = activeDriverData !== null || standalone;

  const assignVehiclesToRoute = () => {
    overrideCurrentRoutes.mutate({
      data: selectedData,
      routeId,
    });
  };

  return (
    <Sheet open={isDriverSheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetContent
        side={"left"}
        className="radix-dialog-content flex w-full max-w-full flex-col sm:w-full sm:max-w-full md:max-w-md lg:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="text-center text-xl md:text-left">
            {title}
          </SheetTitle>
          <DriverSheetDescription activeVehicle={activeDriverData} />
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

                <DataTable
                  storeData={getRouteVehicles?.data ?? []}
                  data={getDepotDrivers?.data ?? []}
                  setSelectedData={setSelectedData}
                  idAccessor={(row) => row.driver?.id}
                  accessorKey="driver_name"
                  columns={driverDepotColumns}
                  type="driver"
                  searchPlaceholder="Search drivers..."
                />
              </TabsContent>
              <TabsContent value="newDriver">
                <DriverForm
                  handleOnOpenChange={onSheetOpenChange}
                  activeDriver={activeDriverData}
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
            activeDriver={activeDriverData}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
