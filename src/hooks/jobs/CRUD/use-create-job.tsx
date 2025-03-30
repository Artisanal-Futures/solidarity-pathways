import { useRouter } from "next/navigation";
import { clientJobDataForNewLatLng } from "~/data/stop-data";

import type { ClientJobBundle } from "~/types.wip";
import { api } from "~/trpc/react";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";

import { useSolidarityState } from "../../optimized-data/use-solidarity-state";
import { useStopsStore } from "../use-stops-store";

type Coordinates = {
  lat: number;
  lng: number;
};

type TCreateNewJobProps = {
  job: ClientJobBundle;
  addToRoute?: boolean;
};

type TCreateNewJobsProps = {
  jobs: ClientJobBundle[];
  addToRoute?: boolean;
};
export const useCreateJob = () => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["jobs", "routePlan"],
  });

  const { isUserAllowedToSaveToDepot, depotId, routeId, routeDate } =
    useSolidarityState();

  const sessionStorageJobs = useStopsStore((state) => state);

  const router = useRouter();

  const createJobBundles =
    api.jobs.createJobBundles.useMutation(defaultActions);

  const duplicateJobsToRoute =
    api.jobs.duplicateJobsToRoute.useMutation(defaultActions);

  const createRouteWithJobBundles =
    api.jobs.createRouteFromJobBundles.useMutation({
      ...defaultActions,
      onSuccess: ({ data, message }) => {
        defaultActions.onSuccess({ message });
        router.push(`/${depotId}/route/${data.route.id}?mode=plan`);
      },
    });

  const createNewJobByLatLng = ({ lat, lng }: Coordinates) => {
    const job = clientJobDataForNewLatLng(lat, lng);

    if (isUserAllowedToSaveToDepot) {
      createJobBundles.mutate({
        bundles: [
          { job: job.job, client: job.client?.email ? job.client : undefined },
        ],
        depotId: depotId,
        routeId: routeId,
      });
    } else {
      sessionStorageJobs.appendLocation(job);
    }
  };

  const createNewJob = ({ job, addToRoute }: TCreateNewJobProps) => {
    if (isUserAllowedToSaveToDepot) {
      createJobBundles.mutate({
        bundles: [
          { job: job.job, client: job.client?.email ? job.client : undefined },
        ],
        depotId,
        routeId: addToRoute ? routeId : undefined,
      });
    } else {
      sessionStorageJobs.appendLocation({
        job: job.job,
        client: job.client?.email ? job.client : undefined,
      });
    }
  };

  const createNewJobs = ({ jobs, addToRoute }: TCreateNewJobsProps) => {
    const filterClientsWithoutEmails = jobs.map((job) => ({
      job: job.job,
      client: job.client?.email ? job.client : undefined,
    }));

    const doesRouteExist = routeId !== undefined;

    if (doesRouteExist)
      createJobBundles.mutate({
        bundles: filterClientsWithoutEmails,
        depotId,
        routeId: addToRoute ? routeId : undefined,
      });
    else
      createRouteWithJobBundles.mutate({
        bundles: filterClientsWithoutEmails,
        depotId,
        date: routeDate ?? new Date(),
      });
  };

  const duplicateJobIdsToRoute = ({ jobs }: { jobs: string[] }) => {
    const doesRouteExist = routeId !== undefined;

    if (doesRouteExist)
      duplicateJobsToRoute.mutate({
        bundleIds: jobs,
        depotId,
        routeId,
      });
  };

  return {
    createNewJob,
    createNewJobs,
    createNewJobByLatLng,

    duplicateJobIdsToRoute,
  };
};
