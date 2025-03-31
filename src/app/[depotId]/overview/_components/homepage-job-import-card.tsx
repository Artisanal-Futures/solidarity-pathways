"use client";

import { useRouter } from "next/navigation";
import { clientJobUploadOptions } from "~/data/stop-data";
import { MapPin } from "lucide-react";

import type { HomePageImportBtnProps } from "./homepage-overview-import-btn";
import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { UploadOptions } from "~/types/misc";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { FileUploadModal } from "~/components/shared/file-upload-modal.wip";

import { HomePageOverviewImportBtn } from "./homepage-overview-import-btn";

type UploadButtonOptions<T> = {
  button: HomePageImportBtnProps;
  fileUpload: UploadOptions<T> | null;
};

export const HomepageJobImportCard = () => {
  const router = useRouter();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["job", "routePlan"],
  });

  const { depotId, routeId, routeDate, depotMode } = useSolidarityState();

  const createJobBundles = api.job.createMany.useMutation({
    ...defaultActions,
    onSuccess: ({ route, message }) => {
      defaultActions.onSuccess({ message });
      if (!!route && route !== routeId)
        router.push(`/${depotId}/route/${route}?mode=plan`);
    },
  });

  const { data: routeJobs } = api.routePlan.getJobBundles.useQuery(
    { routeId },
    { enabled: routeId !== undefined },
  );

  const { data: depotClients } = api.customer.getAll.useQuery(depotId, {
    enabled: !!depotId && !!depotMode && depotMode !== "calculate",
  });

  const jobImportButtonProps = {
    button: {
      Icon: MapPin,
      caption: "Add your stops from spreadsheet",
      isProcessed: depotClients?.length ?? 0 > 0,
    },
    fileUpload: clientJobUploadOptions({
      jobs: routeJobs ?? [],
      setJobs: ({ jobs, addToRoute }) => {
        const doesRouteExist =
          routeId !== undefined
            ? { routeId: addToRoute ? routeId : undefined }
            : { date: routeDate ?? new Date() };

        createJobBundles.mutate({
          bundles: jobs,
          depotId,
          ...doesRouteExist,
        });
      },
    }),
  } as UploadButtonOptions<ClientJobBundle>;

  return (
    <FileUploadModal<ClientJobBundle> {...jobImportButtonProps.fileUpload!}>
      <span>
        <HomePageOverviewImportBtn {...jobImportButtonProps.button} />
      </span>
    </FileUploadModal>
  );
};
