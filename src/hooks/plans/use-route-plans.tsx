/* eslint-disable react-hooks/exhaustive-deps */

import type { OptimizationPlan } from "~/lib/validators/optimization";
import { api } from "~/trpc/react";

import optimizationService from "../../services/optimization";
import { useSolidarityState } from "../optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "../use-default-mutation-actions";

export const useRoutePlans = () => {
  const { routeId } = useSolidarityState();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["routePlan", "job", "vehicle"],
  });

  const getRouteVehicles = api.vehicle.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const getRoutePlanById = api.routePlan.get.useQuery(routeId, {
    enabled: !!routeId,
  });

  const getRouteJobs = api.job.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const unassignedJobs = getRouteJobs?.data?.filter(
    (bundle) => !bundle.job.isOptimized,
  );

  const setOptimizedData =
    api.routePlan.optimizeWithVroom.useMutation(defaultActions);

  const calculateRoutes = async (selectedJobIds?: string[]) => {
    const jobs_bundles = optimizationService.formatClientData(
      getRouteJobs?.data ?? [],
    );
    const vehicles = optimizationService.formatDriverData(
      getRouteVehicles?.data ?? [],
    );

    let jobs = jobs_bundles;

    if (jobs.length === 0 || vehicles.length === 0) {
      return;
    }

    // Filter jobs if selectedJobIds is provided and not empty
    if (selectedJobIds && selectedJobIds.length > 0) {
      jobs = jobs_bundles.filter((job) =>
        selectedJobIds.includes(job.description),
      );
    }

    const params = {
      jobs,
      vehicles,
      options: {
        g: true,
      },
    };

    const results = await optimizationService.calculateOptimalPaths(params);

    setOptimizedData.mutate({
      routeId: routeId,
      plan: results as OptimizationPlan,
    });
  };

  return {
    optimized: getRoutePlanById.data?.optimizedRoute ?? [],
    unassigned: unassignedJobs,
    calculate: calculateRoutes,
    isRouteDataMissing:
      getRoutePlanById.data?.jobs.length === 0 ||
      getRoutePlanById.data?.vehicles.length === 0,
  };
};
