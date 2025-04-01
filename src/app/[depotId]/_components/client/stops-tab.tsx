import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { clientJobUploadOptions } from "~/data/stop-data";
import { useClient } from "~/providers/client";
import { Lightbulb } from "lucide-react";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { DataCard } from "~/components/shared/data-card";
import { FileUploadModal } from "~/components/shared/file-upload-modal.wip";
import { LoadButton } from "~/components/shared/load-button";

import { CommandSearchJobs } from "./command-search-jobs";
import StopOptionBtn from "./stop-option-btn.wip";

export const StopsTab = () => {
  const router = useRouter();
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["job", "customer", "routePlan"],
  });
  const { depotId, routeId, routeDate } = useSolidarityState();

  const getRouteJobs = api.job.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const createJobBundles = api.job.createMany.useMutation({
    ...defaultActions,
    onSuccess: ({ route, message }) => {
      defaultActions.onSuccess({ message });
      if (!!route && route !== routeId)
        router.push(`/${depotId}/route/${route}?mode=plan`);
    },
  });

  const fileUploadOptions = useMemo(
    () =>
      clientJobUploadOptions({
        jobs: getRouteJobs.data ?? [],
        setJobs: ({ jobs: newJobs }) => {
          const doesRouteExist =
            routeId !== undefined
              ? { routeId }
              : { date: routeDate ?? new Date() };

          createJobBundles.mutate({
            bundles: newJobs ?? [],
            depotId,
            ...doesRouteExist,
          });
        },
      }),
    [getRouteJobs.data],
  );

  const { addPreviousJob, createNewJob } = useClient();

  return (
    <>
      <div className="flex flex-col px-4">
        <div className="flex items-center justify-between">
          <h2 className="flex scroll-m-20 gap-3 text-xl font-semibold tracking-tight">
            Stops{" "}
            <span className="rounded-lg border border-slate-300 px-2 text-base">
              {getRouteJobs.data?.length ?? 0}
            </span>
          </h2>

          {getRouteJobs.data?.length !== 0 && <StopOptionBtn />}
        </div>
        <CommandSearchJobs />
        {getRouteJobs.data?.length === 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              No stops have been added to this route yet.
            </p>{" "}
            <div className="flex flex-col space-y-3 py-4">
              <FileUploadModal<ClientJobBundle> {...fileUploadOptions}>
                <LoadButton
                  className="w-full"
                  size={"lg"}
                  isLoading={createJobBundles.isPending}
                >
                  Import stops from spreadsheet{" "}
                </LoadButton>
              </FileUploadModal>
              <Button
                variant={"outline"}
                size={"lg"}
                onClick={() => addPreviousJob()}
              >
                Add previous stops & clients
              </Button>

              <Button
                variant={"outline"}
                size={"lg"}
                onClick={() => createNewJob()}
              >
                Manually add new stop
              </Button>
            </div>
            <div className="flex items-center bg-muted text-xs">
              <Lightbulb className="h-6 w-6" />
              <p>
                Hint: You can right click the map and add stops and new drivers
              </p>
            </div>
          </>
        )}
      </div>

      <ScrollArea className="flex-1 px-4">
        {!!getRouteJobs.data &&
          getRouteJobs.data?.length > 0 &&
          getRouteJobs.data?.map((listing, idx) => (
            <DataCard
              key={idx}
              id={listing.job.id}
              name={listing?.client?.name ?? `Job # ${listing.job.id}`}
              subtitle={listing.job.address.formatted}
              type="job"
            />
          ))}
      </ScrollArea>
    </>
  );
};
