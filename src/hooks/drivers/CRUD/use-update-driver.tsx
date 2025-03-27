import { toastService } from "@dreamwalker-studios/toasts";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDriversStore } from "~/stores/use-drivers-store";

import { api } from "~/trpc/react";

import type { DriverVehicleBundle } from "~/types.wip";

type UpdateProps = {
  bundle: DriverVehicleBundle;
};

type UpdateWithIdProps = {
  id: string | undefined;
} & UpdateProps;
export const useUpdateDriver = () => {
  const invalidateData = () => {
    void apiContext.drivers.invalidate();
    void apiContext.routePlan.invalidate();
  };

  const { isUserAllowedToSaveToDepot, routeId, depotId } = useSolidarityState();

  const sessionStorageDrivers = useDriversStore((state) => state);

  const apiContext = api.useContext();

  const updateDriverDefaults = api.drivers.updateDriverDefaults.useMutation({
    onSuccess: () =>
      toastService.success("Driver defaults were successfully updated."),
    onError: (error) =>
      toastService.error({
        message: "Oops! Something went wrong with updating driver defaults.",
        error,
      }),

    onSettled: invalidateData,
  });

  const updateDriverChannel =
    api.routeMessaging.updateDriverChannelByEmail.useMutation({
      onSuccess: () =>
        toastService.success("Driver channel was successfully updated."),
      onError: (error) =>
        toastService.error({
          message: "Oops! Something went wrong with updating driver channel.",
          error,
        }),

      onSettled: invalidateData,
    });

  const updateVehicleDetails = api.drivers.updateVehicleDetails.useMutation({
    onSuccess: () =>
      toastService.success("Vehicle details were successfully updated."),
    onError: (error) =>
      toastService.error({
        message: "Oops! Something went wrong with updating vehicle details.",
        error,
      }),

    onSettled: invalidateData,
  });

  const updateDriverDetails = api.drivers.updateDriverDetails.useMutation({
    onSuccess: () =>
      toastService.success("Driver details were successfully updated."),
    onError: (error) =>
      toastService.error({
        message: "Oops! Something went wrong with updating driver details.",
        error,
      }),
    onSettled: invalidateData,
  });

  const updateRouteVehicle = ({ bundle }: UpdateProps) => {
    if (!isUserAllowedToSaveToDepot) {
      sessionStorageDrivers.updateDriver(bundle.vehicle.id, bundle);
      return;
    }

    updateVehicleDetails.mutate({
      vehicle: bundle.vehicle,
      routeId: routeId,
    });
  };

  const updateDepotDriverDetails = ({ bundle }: UpdateProps) => {
    if (!isUserAllowedToSaveToDepot) {
      sessionStorageDrivers.updateDriver(bundle.vehicle.id, bundle);
      return;
    }

    updateDriverDetails.mutate({
      driverId: bundle.driver.id,
      driver: bundle.driver,
    });
  };

  const updateDepotDriverDefaults = ({ id, bundle }: UpdateWithIdProps) => {
    if (!isUserAllowedToSaveToDepot) {
      sessionStorageDrivers.updateDriver(bundle.vehicle.id, bundle);
      return;
    }

    if (!id) throw new Error("No default vehicle id");

    updateDriverDefaults.mutate({
      bundle,
      defaultId: id,
      depotId: depotId,
    });
  };

  const updateDriverChannelName = ({
    email,
    channelName,
  }: {
    email: string;
    channelName: string;
  }) => {
    if (!isUserAllowedToSaveToDepot) {
      return;
    }

    updateDriverChannel.mutate({
      email,
      channelName,
      depotId: depotId,
    });
  };

  return {
    updateRouteVehicle,
    updateDepotDriverDetails,
    updateDepotDriverDefaults,
    updateDriverChannel,
    updateDriverChannelName,
  };
};
