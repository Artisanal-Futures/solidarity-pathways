"use client";

import { driverVehicleUploadOptions } from "~/data/driver-data";
import { Truck } from "lucide-react";

import type { HomePageImportBtnProps } from "~/app/[depotId]/overview/_components/homepage-overview-import-btn";
import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import type { UploadOptions } from "~/types/misc";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { FileUploadModal } from "~/components/shared/file-upload-modal.wip";
import { HomePageOverviewImportBtn } from "~/app/[depotId]/overview/_components/homepage-overview-import-btn";

type UploadButtonOptions<T> = {
  button: HomePageImportBtnProps;
  fileUpload: UploadOptions<T> | null;
};

export const HomepageDriverImportCard = () => {
  const { depotId, routeId, depotMode } = useSolidarityState();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "routePlan"],
  });

  const { data: routeDrivers } = api.vehicle.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const { data: depotDrivers } = api.driver.getAll.useQuery(depotId, {
    enabled: !!depotId && depotMode !== "calculate",
  });

  const createVehicleBundles =
    api.driver.createMany.useMutation(defaultActions);

  const driverImportButtonProps = {
    button: {
      Icon: Truck,
      caption: "Add your drivers from spreadsheet",
      isProcessed: depotDrivers?.length ?? 0 > 0,
    },
    fileUpload: driverVehicleUploadOptions({
      drivers: routeDrivers ?? [],
      setDrivers: ({ drivers, addToRoute }) => {
        createVehicleBundles.mutate({
          data: drivers,
          depotId: depotId,
          routeId: addToRoute ? routeId : undefined,
        });
      },
    }),
  } as UploadButtonOptions<DriverVehicleBundle>;

  return (
    <FileUploadModal<DriverVehicleBundle>
      {...driverImportButtonProps.fileUpload!}
    >
      <span>
        <HomePageOverviewImportBtn {...driverImportButtonProps.button} />
      </span>
    </FileUploadModal>
  );
};
