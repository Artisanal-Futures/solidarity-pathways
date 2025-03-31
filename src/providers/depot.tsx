"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type DepotContextType = {
  depotId: string | null;
  routeId: string | null;
  pathId: string | null;
  routeDate: string | null;
  isUserAllowedToSaveToDepot: boolean;
};

const DepotContext = createContext<DepotContextType | undefined>(undefined);

export const DepotProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const [depotId, setDepotId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [pathId, setPathId] = useState<string | null>(null);
  const [routeDate, setRouteDate] = useState<string | null>(null);
  const [isUserAllowedToSaveToDepot, setIsUserAllowedToSaveToDepot] =
    useState<boolean>(true);

  useEffect(() => {
    if (!pathname) return;

    // Extract depotId, routeId, and pathId from URL
    const depotMatch = /\/([^/]+)(?:\/|$)/.exec(pathname);
    const routeMatch = /\/route\/([^/]+)(?:\/|$)/.exec(pathname);
    const pathMatch = /\/path\/([^/]+)(?:\/|$)/.exec(pathname);

    if (depotMatch?.[1]) {
      setDepotId(depotMatch[1]);
    } else {
      setDepotId(null);
    }

    if (routeMatch?.[1]) {
      setRouteId(routeMatch[1]);

      // Set default route date to today if route exists
      if (!routeDate) {
        const today = new Date().toISOString().split("T")[0];
        setRouteDate(today ?? null);
      }
    } else {
      setRouteId(null);
    }

    if (pathMatch?.[1]) {
      setPathId(pathMatch[1]);
    } else {
      setPathId(null);
    }
  }, [pathname, routeDate]);

  const value = {
    depotId,
    routeId,
    pathId,
    routeDate,
    isUserAllowedToSaveToDepot,
  };

  return (
    <DepotContext.Provider value={value}>{children}</DepotContext.Provider>
  );
};

export const useDepot = (): DepotContextType => {
  const context = useContext(DepotContext);
  if (context === undefined) {
    throw new Error("useDepot must be used within a DepotProvider");
  }
  return context;
};
