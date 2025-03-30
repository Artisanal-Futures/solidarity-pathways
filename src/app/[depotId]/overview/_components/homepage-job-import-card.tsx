import { clientJobUploadOptions } from "~/data/stop-data";
import { MapPin } from "lucide-react";

import type { HomePageImportBtnProps } from "./homepage-overview-import-btn";
import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { UploadOptions } from "~/types/misc";
import { useCreateJob } from "~/hooks/jobs/CRUD/use-create-job";
import { useReadJob } from "~/hooks/jobs/CRUD/use-read-job";
import { FileUploadModal } from "~/components/shared/file-upload-modal.wip";

import { HomePageOverviewImportBtn } from "./homepage-overview-import-btn";

type UploadButtonOptions<T> = {
  button: HomePageImportBtnProps;
  fileUpload: UploadOptions<T> | null;
};

export const HomepageJobImportCard = () => {
  const { routeJobs, depotClients } = useReadJob();
  const { createNewJobs } = useCreateJob();

  const jobImportButtonProps = {
    button: {
      Icon: MapPin,
      caption: "Add your stops from spreadsheet",
      isProcessed: depotClients.length > 0,
    },
    fileUpload: clientJobUploadOptions({
      jobs: routeJobs,
      setJobs: createNewJobs,
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
