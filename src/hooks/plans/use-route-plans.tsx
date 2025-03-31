import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { toastService } from "@dreamwalker-studios/toasts";

import type { OptimizationPlan } from "../../types.wip";
import { api } from "~/trpc/react";

import optimizationService from "../../services/optimization";
import { generatePassCode } from "../../utils/generic/generate-passcode";
import { getUniqueKey } from "../../utils/generic/unique-key";
import { useDepot } from "../depot/use-depot";
import { useSolidarityState } from "../optimized-data/use-solidarity-state";
import { useRoutingSolutions } from "./use-routing-solutions";

export const useRoutePlans = () => {
  const { depotId, routeDate, routeId, dateParam } = useSolidarityState();
  const apiContext = api.useUtils();
  const { data: session } = useSession();

  const pathname = usePathname();
  const router = useRouter();

  const getRouteVehicles = api.routePlan.getVehicleBundles.useQuery(
    { routeId: routeId },
    { enabled: !!routeId },
  );

  const routingSolutions = useRoutingSolutions();
  const { currentDepot } = useDepot();
  // const routeId = params?.routeId ;
  // const user = session?.user ?? null;
  const isSandbox = pathname?.includes("sandbox");
  const isUserAllowedToSaveToDepot = session?.user !== null && !isSandbox;

  const getRoutePlanById = api.routePlan.getRoutePlanById.useQuery(
    {
      id: routeId,
    },
    {
      enabled: !!routeId,
    },
  );

  const getRoutePlanData = api.routePlan.getRoutePlanById.useQuery(
    { id: routeId },
    { enabled: false },
  );

  const getRouteJobs = api.routePlan.getJobBundles.useQuery(
    { routeId },
    { enabled: !!routeId },
  );

  const createRoutePlan = api.routePlan.createRoutePlan.useMutation({
    onSuccess: (data) => {
      toastService.success("Route created!");
      router.push(`/${depotId}/route/${data.id}?mode=plan`);
    },
    onError: (error) => {
      toastService.error({
        message: "There was an error creating the route. Please try again.",
        error,
      });
      console.error(error);
    },
    onSettled: () => {
      console.log("settled");
    },
  });

  const route = getRoutePlanById?.data;

  const unassignedJobs = getRouteJobs?.data?.filter(
    (bundle) => !bundle.job.isOptimized,
  );

  const assignedJobs = getRouteJobs?.data?.filter(
    (bundle) => bundle.job.isOptimized,
  );

  const setOptimizedData = api.routePlan.setOptimizedDataWithVroom.useMutation({
    onSuccess: () => {
      toastService.success("Optimized data has been saved");
    },
    onError: (error) => {
      toastService.error({
        message: "Error saving optimized data",
        error,
      });
    },
    onSettled: () => {
      void apiContext.routePlan.invalidate();
    },
  });

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

    if (isUserAllowedToSaveToDepot) {
      setOptimizedData.mutate({
        routeId: routeId,
        plan: results as OptimizationPlan,
      });
    } else {
      const uniqueKey = await getUniqueKey({
        locations: getRouteJobs?.data ?? [],
        drivers: getRouteVehicles?.data ?? [],
      });

      routingSolutions.setRoutingSolutions(uniqueKey, results);
    }
  };

  const jobVehicleBundles = useMemo(() => {
    if (!route || !route.optimizedRoute || route?.optimizedRoute?.length === 0)
      return [];

    return route.optimizedRoute.map((route) => ({
      vehicleId: route.vehicleId,
      jobIds: route.stops
        .filter((stop) => stop.jobId)
        .map((stop) => stop.jobId),
    }));
  }, [route]);

  const findVehicleIdByJobId = (jobId: string): string => {
    return (
      jobVehicleBundles.find((bundle) => bundle.jobIds.includes(jobId))
        ?.vehicleId ?? ""
    );
  };

  const emailBundles = useMemo(() => {
    const bundles = getRoutePlanById.data?.optimizedRoute?.map((route) => {
      return {
        email: route?.vehicle?.driver?.email,
        url: `http://localhost:3000/${depotId}/route/${routeId}/path/${
          route.id
        }?pc=${generatePassCode(route?.vehicle?.driver?.email ?? "")}`,
        passcode: generatePassCode(route?.vehicle?.driver?.email ?? ""),
      };
    });

    return bundles?.filter((bundle) => bundle.email);
  }, [getRoutePlanById.data?.optimizedRoute, routeId]);

  const getAllRoutes = api.routePlan.getAllRoutes.useQuery(
    { depotId },
    { enabled: !!depotId },
  );

  const getAllRoutesByDate = api.routePlan.getRoutePlansByDate.useQuery(
    {
      date: routeDate ?? new Date(),
      depotId,
    },
    {
      enabled: !!depotId && !!dateParam,
    },
  );

  const clearRoute = api.routePlan.clearRoute.useMutation();

  return {
    data: getRoutePlanById.data ?? null,
    isLoading: getRoutePlanById.isLoading,
    optimized: getRoutePlanById.data?.optimizedRoute ?? [],
    assigned: assignedJobs,
    unassigned: unassignedJobs,
    unassignedIds: unassignedJobs?.map((job) => job.job.id),
    calculate: calculateRoutes,
    bundles: jobVehicleBundles,
    findVehicleIdByJobId,
    emailBundles,
    allRoutes: getAllRoutes.data ?? [],
    routesByDate: getAllRoutesByDate.data ?? [],
    create: createRoutePlan.mutate,
    depot: currentDepot,
    getRoutePlanData,
    clearRoute,
  };
};
