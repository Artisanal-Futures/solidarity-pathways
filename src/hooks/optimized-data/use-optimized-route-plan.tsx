import type { LatLngExpression } from "leaflet";
import { useMemo } from "react";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { MapPoint } from "~/types/geolocation";
import { checkIfJobExistsInRoute } from "~/lib/helpers/get-specifics";
import { api } from "~/trpc/react";

import { cuidToIndex } from "../../utils/generic/format-utils.wip";
import { useDefaultMutationActions } from "../use-default-mutation-actions";
import { useSolidarityState } from "./use-solidarity-state";

type OptimizedRoutePathMapData = {
  driver: MapPoint[];
  jobs: MapPoint[];
  geometry: {
    id: string;
    geoJson: string;
    vehicleId: string;
  }[];
};

export const useOptimizedRoutePlan = () => {
  const { pathId, routeId } = useSolidarityState();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["routePlan", "job", "vehicle"],
  });

  const updateRoutePathStatus =
    api.routePlan.updateOptimizedPath.useMutation(defaultActions);

  const getOptimizedData = api.routePlan.getOptimized.useQuery(pathId, {
    enabled: !!pathId,
  });

  const getRoutePlan = api.routePlan.get.useQuery(routeId, {
    enabled: !!routeId,
  });

  const getRouteJobs = api.job.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const assigned = getOptimizedData.data?.stops
    ?.filter((job) => job.type === "job" && job.jobId !== null)
    .map((job) =>
      checkIfJobExistsInRoute({
        id: job?.jobId ?? null,
        routeJobs: getRouteJobs.data ?? [],
      }),
    ) as ClientJobBundle[];

  const mapData: OptimizedRoutePathMapData = useMemo(() => {
    const currentVehicle = getRoutePlan.data?.vehicles.find(
      (vehicle) => vehicle.id === getOptimizedData.data?.vehicleId,
    );

    if (!getOptimizedData.data)
      return {
        driver: [],
        jobs: [],
        geometry: [],
      };

    return {
      driver: [
        {
          id: currentVehicle?.id,
          name: currentVehicle?.driver?.name,
          type: "vehicle",
          lat: currentVehicle?.startAddress?.latitude,
          lng: currentVehicle?.startAddress?.longitude,
          address: currentVehicle?.startAddress?.formatted,
          color: cuidToIndex(currentVehicle?.id ?? ""),
        },
      ] as unknown as MapPoint[],
      jobs:
        assigned && assigned.length > 0
          ? (assigned.map((bundle) => {
              return {
                id: bundle?.job.id,
                type: "job",
                lat: bundle?.job?.address?.latitude,
                lng: bundle?.job?.address?.longitude,
                address: bundle?.job?.address?.formatted,
                color: cuidToIndex(currentVehicle?.id ?? ""),
              };
            }) as unknown as MapPoint[])
          : ([] as MapPoint[]),
      geometry: [
        {
          id: getOptimizedData?.data?.id,
          geoJson: getOptimizedData?.data?.geoJson,
          vehicleId: getOptimizedData?.data?.vehicleId,
        },
      ],
    };
  }, [assigned, getOptimizedData.data, getRoutePlan.data]);

  const mapCoordinates = useMemo(() => {
    return {
      driver: mapData?.driver?.map(
        (driver) => [driver.lat, driver.lng] as LatLngExpression,
      ),
      jobs: mapData?.jobs?.map((job) => [job.lat, job.lng] as LatLngExpression),
    };
  }, [mapData]);

  return {
    data: getOptimizedData.data ?? null,

    assigned: assigned ?? [],

    mapData,
    mapCoordinates,

    updateRoutePathStatus: updateRoutePathStatus.mutate,
  };
};
