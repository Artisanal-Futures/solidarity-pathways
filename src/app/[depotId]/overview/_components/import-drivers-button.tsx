/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useMemo } from "react";
import { driverVehicleUploadOptions } from "~/data/driver-data";
import { FilePlus } from "lucide-react";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Button } from "~/components/ui/button";
import { FileUploadModal } from "~/components/shared/file-upload-modal.wip";

export const ImportDriversButton = () => {
  const { depotId, routeId, depotMode } = useSolidarityState();

  const { data: depotDrivers } = api.driver.getAll.useQuery(depotId, {
    enabled: !!depotId && depotMode !== "calculate",
  });

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "routePlan"],
  });

  const createVehicleBundles =
    api.driver.createMany.useMutation(defaultActions);

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
