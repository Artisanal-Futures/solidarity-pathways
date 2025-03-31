"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useDriversStore } from "~/stores/use-drivers-store";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { useUrlParams } from "~/hooks/use-url-params";

type DriverContextType = {
  activeDriverId: string | null;
  setActiveDriverId: (id: string | null) => Promise<void>;
  isDriverActive: (id: string) => boolean;
  activeDriverData: DriverVehicleBundle | null;
  isLoading: boolean;
  isDriverSheetOpen: boolean;
  setIsDriverSheetOpen: (open: boolean) => void;
  openDriverEdit: (id: string) => void;
  closeDriverEdit: () => void;
  onSheetOpenChange: (open: boolean) => void;
  findDriverByEmail: (
    email: string | null,
  ) => Promise<DriverVehicleBundle | null>;
};

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "routePlan"],
  });
  const { updateUrlParams } = useUrlParams();
  const { routeId } = useSolidarityState();
  const driversStore = useDriversStore();
  const [isLoading, setIsLoading] = useState(false);

  const getVehicleByIdControlledMutation =
    api.routePlan.getVehicleByIdControlled.useMutation({
      onSettled: defaultActions.onSettled,
    });

  const findDriverByEmailMutation = api.routePlan.getDriverByEmail.useMutation({
    onSettled: defaultActions.onSettled,
  });

  const getActiveDriver = async (id: string | null) => {
    if (!id) return null;
    const driver = await getVehicleByIdControlledMutation.mutateAsync({
      routeId,
      vehicleId: id,
    });
    return driver;
  };

  const findDriverByEmail = async (email: string | null) => {
    if (!email) return null;
    const driver = await findDriverByEmailMutation.mutateAsync({
      email,
      routeId,
    });

    return driver;
  };

  const setActiveDriverId = async (id: string | null) => {
    setIsLoading(true);
    updateUrlParams({ key: "driverId", value: id });

    if (id) {
      const driver = await getVehicleByIdControlledMutation.mutateAsync({
        routeId,
        vehicleId: id,
      });

      if (driver) {
        driversStore.setActiveDriver(driver);
      } else {
        driversStore.setActiveDriverById(null);
      }
    } else {
      driversStore.setActiveDriverById(null);
    }

    setIsLoading(false);
  };

  const isDriverActive = (id: string) => {
    return driversStore.activeDriver?.vehicle.id === id;
  };

  const openDriverEdit = (id: string) => {
    void setActiveDriverId(id);
    driversStore.setIsDriverSheetOpen(true);
  };

  const closeDriverEdit = () => {
    driversStore.setIsDriverSheetOpen(false);
    void setActiveDriverId(null);
  };

  const onSheetOpenChange = (open: boolean) => {
    if (!open) void setActiveDriverId(null);
    driversStore.setIsDriverSheetOpen(open);
  };

  useEffect(() => {
    // Clean up active driver when component unmounts
    return () => {
      void setActiveDriverId(null);
    };
  }, []);

  const value = {
    activeDriverId: driversStore.activeDriver?.vehicle.id ?? null,
    setActiveDriverId,
    isDriverActive,
    activeDriverData: driversStore.activeDriver,
    isLoading,
    isDriverSheetOpen: driversStore.isDriverSheetOpen,
    setIsDriverSheetOpen: driversStore.setIsDriverSheetOpen,
    openDriverEdit,
    closeDriverEdit,
    onSheetOpenChange,

    findDriverByEmail,
  };

  return (
    <DriverContext.Provider value={value}>{children}</DriverContext.Provider>
  );
};

export const useDriver = (): DriverContextType => {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error("useDriver must be used within a DriverProvider");
  }
  return context;
};
