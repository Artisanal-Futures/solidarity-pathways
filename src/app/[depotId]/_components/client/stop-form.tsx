import { useState } from "react";
import { uniqueId } from "lodash";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import type { StopFormValues } from "~/lib/validators/stop";
import type { Address } from "~/types/geolocation";
import { formatJobFormDataToBundle } from "~/utils/client-job/format-clients.wip";
import {
  secondsToMinutes,
  unixSecondsToMilitaryTime,
} from "~/utils/generic/format-utils.wip";
import { cn } from "~/lib/utils";
import { stopFormSchema } from "~/lib/validators/stop";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Accordion } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { DeleteDialog } from "~/components/delete-dialog";
import { LoadButton } from "~/components/shared/load-button";

import { ClientDetailsSection } from "./client-detail-form";
import { StopDetailsSection } from "./job-details-form";

type Props = {
  handleOnOpenChange: (data: boolean) => void;
  activeLocation?: ClientJobBundle | null;
};

export const StopForm = ({ handleOnOpenChange, activeLocation }: Props) => {
  const [editClient, setEditClient] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>(
    activeLocation ? "item-2" : "item-1",
  );

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["job", "routePlan"],
  });
  const { routeId, depotId } = useSolidarityState();

  const updateJob = api.job.update.useMutation(defaultActions);
  const updateClient = api.customer.update.useMutation(defaultActions);
  const createJob = api.job.create.useMutation(defaultActions);
  const deleteJobFromRoute = api.job.delete.useMutation(defaultActions);

  const defaultValues: Partial<StopFormValues> = {
    id: activeLocation?.job.id ?? uniqueId("job_"),
    clientId: activeLocation?.client?.id ?? undefined,
    addressId: activeLocation?.job.addressId ?? uniqueId("address_"),
    clientAddressId: activeLocation?.client?.addressId ?? undefined,

    type: activeLocation?.job.type ?? "DELIVERY",

    name: activeLocation?.client?.name ?? `Job #${activeLocation?.job.id}`,

    address: {
      formatted: activeLocation?.job.address.formatted ?? undefined,
      latitude: activeLocation?.job.address.latitude ?? undefined,
      longitude: activeLocation?.job.address.longitude ?? undefined,
    } as Address,

    clientAddress: {
      formatted:
        activeLocation?.client?.address?.formatted ??
        activeLocation?.job.address.formatted,
      latitude:
        activeLocation?.client?.address?.latitude ??
        activeLocation?.job.address.latitude,
      longitude:
        activeLocation?.client?.address?.longitude ??
        activeLocation?.job.address.longitude,
    } as Address,

    timeWindowStart:
      unixSecondsToMilitaryTime(activeLocation?.job.timeWindowStart) ?? "09:00",
    timeWindowEnd:
      unixSecondsToMilitaryTime(activeLocation?.job.timeWindowEnd) ?? "17:00",
    serviceTime: secondsToMinutes(activeLocation?.job.serviceTime) ?? 5,
    prepTime: secondsToMinutes(activeLocation?.job.prepTime) ?? 5,

    priority: activeLocation?.job.priority ?? 1,
    email: activeLocation?.client?.email ?? undefined,
    order: activeLocation?.job.order ?? "",
    notes: activeLocation?.job.notes ?? "",
  };

  const form = useForm<StopFormValues>({
    resolver: zodResolver(stopFormSchema),
    defaultValues,
  });

  const onSubmit = async (data: StopFormValues) => {
    const jobBundle = formatJobFormDataToBundle(data);

    if (!activeLocation) {
      await createJob.mutateAsync({
        bundle: {
          job: jobBundle.job,
          client: jobBundle.client?.email ? jobBundle.client : undefined,
        },
        depotId,
        routeId,
      });
      handleOnOpenChange(false);
      return;
    }

    await updateJob.mutateAsync({ job: jobBundle.job, routeId });

    if (editClient && data?.clientId && !data?.clientId.includes("client_")) {
      if (!jobBundle.client) throw new Error("No client was found");
      await updateClient.mutateAsync({ depotId, client: jobBundle.client });
    }

    handleOnOpenChange(false);
  };

  const onDelete = async () => {
    await deleteJobFromRoute.mutateAsync(activeLocation?.job.id ?? "");
    handleOnOpenChange(false);
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex h-full max-h-[calc(100vh-50vh)] w-full flex-col space-y-8 md:h-[calc(100vh-15vh)] lg:flex-grow"
        >
          {!!activeLocation && (
            <div className="flex w-full flex-col gap-3 border-b bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <LoadButton
                  type="submit"
                  className="flex-1"
                  isLoading={updateJob.isPending || updateClient.isPending}
                >
                  Update stop
                </LoadButton>

                <DeleteDialog onConfirm={onDelete} />
              </div>
            </div>
          )}

          {!activeLocation && (
            <div className="flex w-full flex-col gap-3 border-b bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <LoadButton
                  type="submit"
                  className="flex-1"
                  isLoading={createJob.isPending}
                >
                  Add stop
                </LoadButton>
              </div>
            </div>
          )}

          <div className="flex-1">
            <Accordion
              type="single"
              collapsible
              className="w-full px-4"
              defaultValue="item-1"
              value={accordionValue}
              onValueChange={(value) => {
                setAccordionValue(value);
              }}
            >
              <StopDetailsSection form={form} />

              <ClientDetailsSection form={form} editClient={editClient} />
            </Accordion>
          </div>
        </form>
      </Form>

      {activeLocation?.client && (
        <div className="mt-auto w-full flex-col gap-2 space-y-0.5 border-t pt-4">
          <div className="flex w-full">
            <Button
              variant={"link"}
              className={cn(
                "m-0 items-center gap-1 p-0",
                editClient && "hidden",
              )}
              onClick={() => {
                setEditClient((prev) => !prev);
                setAccordionValue("item-2");
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit details for {activeLocation?.client.name}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
