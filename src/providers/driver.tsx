/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { checkIfVehicleExistsInRoute } from "~/lib/helpers/get-specifics";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useUrlParams } from "~/hooks/use-url-params";

type DriverContextType = {
  activeDriverId: string | null;
  setActiveDriverId: (id: string | null) => void;
  isDriverActive: (id: string) => boolean;
  activeDriverData: DriverVehicleBundle | null;
  isLoading: boolean;
  isDriverSheetOpen: boolean;
  setIsDriverSheetOpen: (open: boolean) => void;
  openDriverEdit: (id: string) => void;
  closeDriverEdit: () => void;
  onSheetOpenChange: (open: boolean) => void;

  findVehicleById: (id: string) => DriverVehicleBundle | null;
  findDriverByEmail: (email: string) => DriverVehicleBundle | null;
};

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { updateUrlParams } = useUrlParams();
  const { routeId } = useSolidarityState();
  const [isLoading, setIsLoading] = useState(false);
  const [activeDriver, setActiveDriver] = useState<DriverVehicleBundle | null>(
    null,
  );
  const [isDriverSheetOpen, setIsDriverSheetOpen] = useState(false);

  const getRouteVehicles = api.vehicle.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const findVehicleById = (id: string): DriverVehicleBundle | null => {
    if (!id) return null;
    return checkIfVehicleExistsInRoute({
      id,
      vehicleBundles: getRouteVehicles.data ?? [],
    });
  };

  const findDriverByEmail = (email: string): DriverVehicleBundle | null => {
    return (
      getRouteVehicles.data?.find(
        (vehicle) => vehicle.driver.email === email,
      ) ?? null
    );
  };
  const setActiveDriverId = (id: string | null) => {
    setIsLoading(true);
    updateUrlParams({ key: "driverId", value: id });

    if (id) {
      const driver = checkIfVehicleExistsInRoute({
        id,
        vehicleBundles: getRouteVehicles.data ?? [],
      });

      if (driver) {
        setActiveDriver(driver);
      } else {
        setActiveDriver(null);
      }
    } else {
      setActiveDriver(null);
    }

    setIsLoading(false);
  };

  const isDriverActive = (id: string) => {
    return activeDriver?.vehicle.id === id;
  };

  const openDriverEdit = (id: string) => {
    void setActiveDriverId(id);
    setIsDriverSheetOpen(true);
  };

  const closeDriverEdit = () => {
    setIsDriverSheetOpen(false);
    void setActiveDriverId(null);
  };

  const onSheetOpenChange = (open: boolean) => {
    if (!open) void setActiveDriverId(null);
    setIsDriverSheetOpen(open);
  };

  useEffect(() => {
    // Clean up active driver when component unmounts
    return () => {
      void setActiveDriverId(null);
    };
  }, []);

  const value = {
    activeDriverId: activeDriver?.vehicle.id ?? null,
    setActiveDriverId,
    isDriverActive,
    activeDriverData: activeDriver,
    isLoading,
    isDriverSheetOpen,
    setIsDriverSheetOpen,
    openDriverEdit,
    closeDriverEdit,
    onSheetOpenChange,

    findVehicleById,
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
