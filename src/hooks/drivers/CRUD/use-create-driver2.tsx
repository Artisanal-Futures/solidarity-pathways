import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";

import { useRoadsStore } from "~/stores/use-roads-store";

import { api } from "~/trpc/react";

import { roadDataForNewLatLng } from "~/data/road-data";

import type { Coordinates, RoadBundle } from "~/types.wip";

import { toastService } from "@dreamwalker-studios/toasts";

type TCreateNewRoadProps = { road: RoadBundle };

type RoadBundles = { roads: RoadBundle[] };

type TCreateNewRoadsProps = {
  addToRoute?: boolean;
} & RoadBundles;

export const useCreateRoads = () => {
  // Key, we need to make a Road store
  const sessionStorageRoads = useRoadsStore((state) => state);

  const { isUserAllowedToSaveToDepot, depotId } = useSolidarityState();

  const apiContext = api.useContext();

  const invalidateData = () => {
    void apiContext.roads.invalidate();
  };

  const overrideCurrentDepot = api.roads.setDepotRoads.useMutation({
    onSuccess: () => toastService.success("Depot roads were successfully set."),
    onError: (error) =>
      toastService.error({
        message: "There was an issue setting the road(s). Please try again.",
        error,
      }),
    onSettled: invalidateData,
  });

  const createNewRoad = ({ road }: TCreateNewRoadProps) => {
    if (!isUserAllowedToSaveToDepot) {
      sessionStorageRoads.appendRoad(road);
      return;
    }
  };

  const createNewRoads = ({ roads, addToRoute }: TCreateNewRoadsProps) => {
    if (!isUserAllowedToSaveToDepot) {
      roads.forEach((road) => {
        sessionStorageRoads.appendRoad(road);
      });

      return;
    }
  };

  const createNewRoadByLatLng = (
    { lat, lng }: Coordinates,
    depotId: string,
  ) => {
    const road = roadDataForNewLatLng(lat, lng, depotId); // Assuming this function is adapted for RoadBundle

    if (!isUserAllowedToSaveToDepot) {
      sessionStorageRoads.appendRoad(road);
      return;
    }
  };

  const setDepotRoads = ({
    roads,
    roadId,
  }: RoadBundles & { roadId: string }) => {
    if (!isUserAllowedToSaveToDepot) {
      sessionStorageRoads.setRoads(roads);
      return;
    }

    overrideCurrentDepot.mutate({
      roadId: roadId,
      depotId,
      roadData: roads.flatMap((road) => road.points),
    });
  };

  return {
    createNewRoad,
    createNewRoads,
    createNewRoadByLatLng,
    setDepotRoads,
  };
};
