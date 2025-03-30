"use client";

import { useMemo } from "react";
import { driverVehicleUploadOptions } from "~/data/driver-data";
import { FilePlus } from "lucide-react";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { api } from "~/trpc/react";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { Button } from "~/components/ui/button";
import { FileUploadModal } from "~/components/shared/file-upload-modal.wip";

export const ImportDriversButton = () => {
  const { depotId, routeId, depotMode } = useSolidarityState();

  const { data: depotDrivers } = api.drivers.getDepotDrivers.useQuery(
    { depotId },
    { enabled: !!depotId && depotMode !== "calculate" },
  );

  const { createVehicleBundles } = useDriverVehicleBundles();

  const fileUploadOptions = useMemo(() => {
    return driverVehicleUploadOptions({
      drivers: depotDrivers ?? [],
      setDrivers: ({ drivers, addToRoute }) => {
        createVehicleBundles.mutate({
          data: drivers,
          depotId: depotId,
          routeId: addToRoute ? routeId : undefined,
        });
      },
    });
  }, [depotDrivers, createVehicleBundles]);

  return (
    <FileUploadModal<DriverVehicleBundle> {...fileUploadOptions}>
      <Button className="mx-0 flex gap-2 px-0" variant={"link"}>
        <FilePlus />
        Import Drivers
      </Button>{" "}
    </FileUploadModal>
  );
};
