import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { FileUploadHandler } from "~/types/misc";
import type { VersionOneClientCSV } from "~/types/parsing";
import { formatClientSheetRowToBundle } from "~/utils/client-job/format-clients.wip";
import { parseSpreadSheet } from "~/utils/generic/parse-csv.wip";
import { api } from "~/trpc/react";

export const handleClientSheetUpload: FileUploadHandler<ClientJobBundle> = ({
  event,
  setIsLoading,
  callback,
}) => {
  setIsLoading(true);

  const geocodeByAddress = api.geocode.byAddress.useMutation();

  parseSpreadSheet<VersionOneClientCSV, ClientJobBundle>({
    file: event.target.files![0]!,
    parser: formatClientSheetRowToBundle,
    onComplete: async (data: ClientJobBundle[]) => {
      const revisedClients = await Promise.all(
        data.map(async (clientJobBundle) => {
          const address = await geocodeByAddress.mutateAsync(
            clientJobBundle.job.address.formatted,
          );

          const client = clientJobBundle.client
            ? {
                ...clientJobBundle.client,
                address: {
                  ...address,
                },
              }
            : undefined;

          return {
            client: client,
            job: {
              ...clientJobBundle.job,
              address: {
                ...address,
              },
            },
          };
        }),
      ).catch((err) => {
        console.log(err);
      });
      setIsLoading(false);
      const tableData =
        revisedClients?.map((bundle) => {
          return {
            name: bundle?.client?.name ?? `Job #${bundle.job.id}`,
            address: bundle.job.address.formatted,
            email: bundle?.client?.email ?? "",
          };
        }) ?? [];
      callback({ data: revisedClients ?? [], tableData });
    },
  });
};
