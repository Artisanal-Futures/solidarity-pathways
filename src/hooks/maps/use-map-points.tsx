"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from "react";

import type { MapPoint } from "~/types/map";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";
import { api } from "~/trpc/react";
import { StopIcon } from "~/components/map/stop-icon";

import { useOptimizedRoutePlan } from "../optimized-data/use-optimized-route-plan";
import { useSolidarityState } from "../optimized-data/use-solidarity-state";
import { useRoutePlans } from "../plans/use-route-plans";

type Props = {
  setSelectedJobIds: (selected: string[]) => void;
  selectedJobIds: string[];
};

export const useMapGraphics = ({
  setSelectedJobIds,
  selectedJobIds,
}: Props) => {
  const { pathId, routeId, depotMode } = useSolidarityState();

  const optimizedRoutePlan = useOptimizedRoutePlan();
  const { optimized } = useRoutePlans();

  const getRouteVehicles = api.vehicle.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const getRouteJobs = api.job.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const getRoutePlanById = api.routePlan.get.useQuery(routeId, {
    enabled: !!routeId,
  });

  const jobVehicleBundles = useMemo(() => {
    const route = getRoutePlanById.data;
    if (!route || !route.optimizedRoute || route?.optimizedRoute?.length === 0)
      return [];

    return route.optimizedRoute.map((route) => ({
      vehicleId: route.vehicleId,
      jobIds: route.stops
        .filter((stop) => stop.jobId)
        .map((stop) => stop.jobId),
    }));
  }, []);

  const findVehicleIdByJobId = (jobId: string): string => {
    return (
      jobVehicleBundles.find((bundle) => bundle.jobIds.includes(jobId))
        ?.vehicleId ?? ""
    );
  };

  const driverMapPoints: MapPoint[] | undefined = pathId
    ? optimizedRoutePlan.mapData.driver
    : getRouteVehicles?.data?.map((driver) => ({
        id: driver.vehicle.id,
        type: "vehicle",
        lat: driver.vehicle.startAddress?.latitude,
        lng: driver.vehicle.startAddress?.longitude,
        address: driver.vehicle.startAddress?.formatted ?? "",
        name: driver?.driver?.name ?? "Driver",
        color: optimized.length > 0 ? `${cuidToIndex(driver.vehicle.id)}` : "3",
      }));

  const stopMapPoints: MapPoint[] | undefined = useMemo(() => {
    return pathId
      ? optimizedRoutePlan.mapData.jobs
      : getRouteJobs.data?.map((stop) => ({
          id: stop.job.id,
          type: "job",
          lat: stop.job.address.latitude,
          lng: stop.job.address.longitude,
          address: stop.job.address.formatted,
          name: stop?.client?.name ?? "New Stop",
          color: !stop.job.isOptimized
            ? "-1"
            : `${cuidToIndex(findVehicleIdByJobId(stop.job.id))}`,
        }));
  }, [getRouteJobs?.data, optimizedRoutePlan.mapData.jobs, pathId]);

  let unassignedMapPoints: MapPoint[] =
    stopMapPoints?.filter(
      (stop) => stop.color === "-1" || !selectedJobIds.includes(stop.id),
    ) ?? [];

  let assignedMapPoints: MapPoint[] =
    stopMapPoints?.filter(
      (stop) => stop.color !== "-1" && selectedJobIds.includes(stop.id),
    ) ?? [];

  const handleClearRoute = () => {
    stopMapPoints?.forEach((stop) => {
      if (selectedJobIds.includes(stop.id)) {
        stop.color = "-1";
        console.log("changed  color!");
      }
    });

    setSelectedJobIds([]);
    assignedMapPoints = [];
    assignedMapPoints = [];
    unassignedMapPoints = [...(stopMapPoints ?? [])];
  };

  const routeGeoJsonList = pathId
    ? optimizedRoutePlan.mapData.geometry
    : optimized.map((route) => {
        return {
          id: route.id,
          geoJson: route.geoJson,
          vehicleId: route.vehicleId,
        };
      });

  const getJobStatusColor = (stop: { color: number; id: number }) => {
    let color = stop.color;
    const jobStatus = optimized
      .flatMap((route) =>
        route.stops.filter((aStop) => Number(aStop.jobId) === stop.id),
      )
      .map((stop) => stop.status)[0];

    // Determine the color based on the job's status
    if (jobStatus === "COMPLETED") {
      color = -20; //"#00FF00";
    } else if (jobStatus === "FAILED") {
      color = -10; //"#FF0000";
    }
    console.log("status is", jobStatus, stop.id, color);

    //return color;
    return color; //stop.color
  };

  const assignAnIcon2 = (
    lassoed: boolean,
    optimized: boolean,
    associatedStop: MapPoint,
  ) => {
    let color = "#0000003a"; // Gray, transparent
    let text_overlay = "!!!"; // a subtle marker that something is wrong color wise

    const mode = depotMode ?? undefined;
    if (mode === "plan") {
      if (!lassoed && !optimized) {
        color = "#0000003a"; // Gray, transparent
        text_overlay = ".";
      } else if (lassoed && !optimized) {
        color = "#90F4005a"; // Change to yellow, transparent
        text_overlay = "+";
      } else if (!lassoed && optimized) {
        color = "#FFFF00"; // Bright Yellow, not possible
        text_overlay = "LABEL ERROR";
      } else if (lassoed && optimized) {
        color = "#90F4005a"; // return "Lime green, transparent";
        text_overlay = "+"; // ... this also shouldn't be possible but ... whatevs
      }
    }
    if (mode === "calculate") {
      if (!lassoed && !optimized) {
        color = "#0000003a"; // Remains Gray, transparent
        text_overlay = ".";
      } else if (lassoed && !optimized) {
        color = "#F3CA403a"; //"#6699CC8a" // Warning, this stop not routed
        text_overlay = "-";
      } else if (!lassoed && optimized) {
        color = "#FFFF00"; // Bright Yellow, not possible
        text_overlay = "LABEL ERROR";
      } else if (lassoed && optimized) {
        // Note I just let the assigned layer use it's color=...
        // this is untested
        color = associatedStop.color;
        text_overlay = "$";
      }
    }
    // Then we're in the driver screen
    if (!mode) {
      text_overlay = "";
    }

    return StopIcon({ color, textOverlay: text_overlay });
  };

  return {
    driverMapPoints,
    stopMapPoints,
    unassignedMapPoints,
    assignedMapPoints,
    handleClearRoute,
    routeGeoJsonList,
    assignAnIcon2,
    getJobStatusColor,
  };
};

// Implments state tabel based coloring
//
// Mode    Lassoed Optimized   Color Result
// ----------------------------------
// Plan    No      No          Gray, transparent
// Plan    No      Yes         Bright Yellow # error, not possible
// Plan    Yes     No          Lime Green # part of the routing plan
// Plan    Yes     Yes         Lime Green # part of the routing plan
// Calc    No      No          Gray, transparent
// Calc    No      Yes         Bright Yellow # error, not possible
// Calc    Yes     No          Gray, transparent
// Calc    Yes     Yes         cuidToIndex # use driver color
