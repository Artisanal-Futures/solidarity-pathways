import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

import { useParams, usePathname } from "next/navigation";

import { toastService } from "@dreamwalker-studios/toasts";

import type { ClientJobBundle } from "~/types.wip";

import { useStopsStore } from "../use-stops-store";

export const useUpdateJob = () => {
  // const { updateUrlParams, getUrlParam } = useUrlParams();
  // const routePlan = useRoutePlans();
  const { data: session } = useSession();
  const sessionStorageJobs = useStopsStore((state) => state);

  const pathname = usePathname();

  const params = useParams();

  const apiContext = api.useContext();

  const routeId = params?.routeId as string;
  const depotId = params?.depotId as string;

  const isSandbox = pathname?.includes("sandbox");

  const isUserAllowedToSaveToDepot = (session?.user ?? null) && !isSandbox;

  const updateJob = api.jobs.updateRouteJob.useMutation({
    onSuccess: () => toastService.success("Route was successfully updated."),
    onError: (e) => {
      toastService.error({
        message: "Oops! Something went wrong!",
        error: e,
      });
    },
    onSettled: () => {
      void apiContext.jobs.invalidate();
      void apiContext.routePlan.invalidate();
      // if (routePlan.optimized.length > 0) {
      //   updateUrlParams({ key: "modified", value: "true" });
      // }
    },
  });
  const updateClient = api.jobs.updateDepotClient.useMutation({
    onSuccess: () =>
      toastService.success("Client info was successfully updated."),
    onError: (e) => {
      toastService.error({
        message: "Oops! Something went wrong!",
        error: e,
      });
    },
    onSettled: () => {
      void apiContext.jobs.invalidate();
      void apiContext.routePlan.invalidate();
    },
  });

  const updateRouteJob = ({ bundle }: { bundle: ClientJobBundle }) => {
    if (isUserAllowedToSaveToDepot) {
      updateJob.mutate({
        routeId,
        job: bundle.job,
      });
    } else {
      sessionStorageJobs.updateLocation(bundle.job.id, bundle);
    }
  };

  const updateDepotClient = ({ bundle }: { bundle: ClientJobBundle }) => {
    if (!bundle.client) throw new Error("No client");
    if (isUserAllowedToSaveToDepot) {
      updateClient.mutate({
        depotId: depotId,
        client: bundle.client,
      });
    } else {
      sessionStorageJobs.updateLocation(bundle.job.id, bundle);
    }
  };

  return {
    updateRouteJob,
    updateDepotClient,
  };
};
