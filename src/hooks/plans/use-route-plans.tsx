/* eslint-disable react-hooks/exhaustive-deps */

import { api } from "~/trpc/react";

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

  const formatClientData = api.routeOptimization.formatClient.useMutation();
  const formatDriverData = api.routeOptimization.formatDriver.useMutation();
  const calculateOptimalPaths =
    api.routeOptimization.calculateOptimalPaths.useMutation();

  const calculateRoutes = async (selectedJobIds?: string[]) => {
    const jobs_bundles = await formatClientData.mutateAsync({
      data: getRouteJobs?.data ?? [],
    });
    const vehicles = await formatDriverData.mutateAsync({
      data: getRouteVehicles?.data ?? [],
    });

    let jobs = jobs_bundles.data;

    if (jobs.length === 0 || vehicles.data.length === 0) {
      return;
    }

    // Filter jobs if selectedJobIds is provided and not empty
    if (selectedJobIds && selectedJobIds.length > 0) {
      jobs = jobs_bundles.data.filter((job) =>
        selectedJobIds.includes(job.description),
      );
    }

    const params = {
      jobs,
      vehicles: vehicles.data,
      options: {
        g: true,
      },
    };

    const results = await calculateOptimalPaths.mutateAsync(params);

    setOptimizedData.mutate({
      routeId: routeId,
      plan: results.data,
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
