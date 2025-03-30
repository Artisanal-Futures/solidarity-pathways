import { driverVehicleDataForNewLatLng } from "~/data/driver-data";
import { useDriversStore } from "~/stores/use-drivers-store";

import type { Coordinates } from "~/types/geolocation";
import { api } from "~/trpc/react";
import { useUrlParams } from "~/hooks/use-url-params";

import { useSolidarityState } from "../optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "../use-default-mutation-actions";
import { useSolidarityMessaging } from "../use-solidarity-messaging";
import { useReadDriver } from "./CRUD/use-read-driver";

export const useDriverVehicleBundles = () => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["drivers", "routePlan"],
  });

  const { updateUrlParams } = useUrlParams();
  const getVehicleByIdControlledMutation =
    api.routePlan.getVehicleByIdControlled.useMutation({
      onSettled: defaultActions.onSettled,
    });

  const { depotId, routeId } = useSolidarityState();

  const { createDriverChannels } = useSolidarityMessaging();

  const readDriver = useReadDriver();

  const sessionStorageDrivers = useDriversStore((state) => state);

  const setActiveDriver = async (id: string | null) => {
    updateUrlParams({ key: "driverId", value: id });

    const driver = await getVehicleByIdControlledMutation.mutateAsync({
      routeId,
      vehicleId: id ?? "",
    });

    if (!driver) {
      sessionStorageDrivers.setActiveDriverById(null);
      return;
    }

    sessionStorageDrivers.setActiveDriver(driver);
  };

  const findDriverByEmailMutation = api.routePlan.getDriverByEmail.useMutation({
    onSettled: defaultActions.onSettled,
  });

  const findDriverByEmail = async (email: string | null) => {
    if (!email) return null;
    const driver = await findDriverByEmailMutation.mutateAsync({
      email,
      routeId,
    });

    return driver;
  };

  ///////////////////////////////
  /////// Create  /////////////
  ///////////////////////////////

  const createVehicleBundles =
    api.drivers.createVehicleBundles.useMutation(defaultActions);

  const overrideCurrentRoutes = api.routePlan.setRouteVehicles.useMutation({
    ...defaultActions,
    onSettled: () => {
      defaultActions.onSettled();
      sessionStorageDrivers.setIsDriverSheetOpen(false);
      sessionStorageDrivers.setActiveDriver(null);
    },
  });

  const createNewDriverByLatLng = async ({
    latitude,
    longitude,
  }: Coordinates) => {
    const driver = driverVehicleDataForNewLatLng(latitude, longitude);

    const { data } = await createVehicleBundles.mutateAsync({
      data: [driver],
      depotId,
      routeId: routeId,
    });

    const driverIds = data.map((driver) => driver.driver.id);

    createDriverChannels.mutate({
      depotId: depotId,
      bundles: driverIds,
    });
  };

  ///////////////////////////////
  /////// Delete  /////////////
  ///////////////////////////////

  const deleteVehicleMutation =
    api.drivers.deleteVehicle.useMutation(defaultActions);

  const deleteDriverMutation =
    api.drivers.deleteVehicleBundle.useMutation(defaultActions);

  const purgeAllDriversMutation =
    api.drivers.deleteAllDepotDrivers.useMutation(defaultActions);

  ///////////////////////////////
  /////// Update  /////////////
  ///////////////////////////////

  const updateDriverDefaultsMutation =
    api.drivers.updateDriverDefaults.useMutation(defaultActions);

  const updateDriverChannelMutation =
    api.routeMessaging.updateDriverChannelByEmail.useMutation(defaultActions);

  const updateVehicleDetailsMutation =
    api.drivers.updateVehicleDetails.useMutation(defaultActions);

  const updateDriverDetailsMutation =
    api.drivers.updateDriverDetails.useMutation(defaultActions);

  return {
    active: sessionStorageDrivers.activeDriver,
    setActive: setActiveDriver,
    isActive: (id: string) => {
      return sessionStorageDrivers.activeDriver?.vehicle.id === id;
    },

    edit: (id: string) => {
      void setActiveDriver(id);
      sessionStorageDrivers.setIsDriverSheetOpen(true);
    },

    isSheetOpen: sessionStorageDrivers.isDriverSheetOpen,
    onSheetOpenChange: (state: boolean) => {
      if (!state) void setActiveDriver(null);
      sessionStorageDrivers.setIsDriverSheetOpen(state);
    },

    findDriverByEmail,

    ///////////////////////////////
    /////// Create  /////////////
    ///////////////////////////////

    createNewDriverByLatLng,
    overrideCurrentRoutes,
    createVehicleBundles,

    ///////////////////////////////
    /////// Delete  /////////////
    ///////////////////////////////

    deleteVehicleMutation,
    deleteDriverMutation,
    purgeAllDriversMutation,

    ///////////////////////////////
    /////// Update  /////////////
    ///////////////////////////////

    updateVehicleDetailsMutation,
    updateDriverChannelMutation,
    updateDriverDefaultsMutation,
    updateDriverDetailsMutation,
  };
};
