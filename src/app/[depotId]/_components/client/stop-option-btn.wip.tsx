"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clientJobUploadOptions } from "~/data/stop-data";
import { ChevronDownIcon, FilePlus2 } from "lucide-react";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import { FileUploadModal } from "~/components/shared/file-upload-modal.wip";
import { JobClientSheetBtn } from "~/app/[depotId]/_components/client/job-client-sheet-btn";

const StopOptionBtn = () => {
  const router = useRouter();
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["job", "customer", "routePlan"],
  });
  const { depotId, routeId, routeDate } = useSolidarityState();
  const [isOpen, setIsOpen] = useState(false);
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
        jobs: getRouteJobs?.data ?? [],
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
    [getRouteJobs?.data],
  );

  const closeSheetFirst = () => {
    setIsOpen(false);
  };

  return (
    <div className="z-30 flex w-auto items-center justify-between rounded-md border bg-white text-secondary-foreground">
      <JobClientSheetBtn />

      <Separator orientation="vertical" className="h-[20px]" />
      <FileUploadModal<ClientJobBundle>
        {...fileUploadOptions}
        handleOnClick={closeSheetFirst}
      >
        <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size={"icon"}
              variant={"outline"}
              className="rounded-l-none border-0"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <FilePlus2 className="mr-2 h-4 w-4" />
                Import from CSV
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </FileUploadModal>
    </div>
  );
};

export default StopOptionBtn;
