import { api } from "~/trpc/react";
import { useSolidarityState } from "../optimized-data/use-solidarity-state";

export const useReadRoutePlans = () => {
  const { routeId } = useSolidarityState();
  const currentRoute = api.routePlan.getRoutePlanById.useQuery(
    { id: routeId },
    { enabled: !!routeId },
  );

  return {
    currentRoute: currentRoute.data,
  };
};
