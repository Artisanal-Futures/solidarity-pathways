"use client";

import type { UseFormReturn } from "react-hook-form";
import { UserPlus } from "lucide-react";

import { toastService } from "@dreamwalker-studios/toasts";

import type { StopFormValues } from "~/lib/validators/stop";
import { findCustomerById } from "~/lib/helpers/find-customer-by-id";
import { checkAndHighlightErrors } from "~/lib/helpers/highlight-errors";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  AutoCompleteAddressFormField,
  InputFormField,
  SelectFormField,
  TextareaFormField,
} from "~/components/inputs";

type Props = {
  form: UseFormReturn<StopFormValues>;
  editClient?: boolean;
};

export const ClientDetailsSection = ({ form, editClient }: Props) => {
  const highlightErrors = checkAndHighlightErrors({
    form,
    keys: ["clientAddress.formatted", "name", "email", "phone", "notes"],
  });

  const { depotId, depotMode } = useSolidarityState();
  const getDepotClients = api.customer.getAll.useQuery(depotId, {
    enabled: !!depotId && !!depotMode && depotMode !== "calculate",
  });

  const isClientAssigned = form.watch("clientId") !== undefined;

  const clientAddress = form.watch("clientAddress");
  return (
    <AccordionItem value="item-2" className="group">
      <AccordionTrigger
        className={cn("px-2 text-lg", highlightErrors && "text-red-500")}
      >
        Client Details
      </AccordionTrigger>

      <ScrollArea
        className={cn(
          "transition-all duration-200 ease-in-out group-data-[state=closed]:h-[0vh] group-data-[state=closed]:opacity-0",
          "group-data-[state=open]:h-[35vh] group-data-[state=open]:opacity-100",
        )}
      >
        <AccordionContent className="px-2">
          {isClientAssigned && (
            <p className="mb-4 leading-7 [&:not(:first-child)]:mt-6">
              You can reassign a client to this job:
            </p>
          )}

          <SelectFormField
            form={form}
            disabled={getDepotClients?.data?.length === 0}
            name="clientId"
            label="Client"
            description="Select a client to assign to this job"
            labelClassName="text-sm font-normal text-muted-foreground"
            values={
              getDepotClients?.data?.map((client) => ({
                label: `${client.name}: ${client?.address?.formatted}`,
                value: client.id,
              })) ?? []
            }
            onValueChange={(value) => {
              const customer = findCustomerById({
                id: value,
                customers: getDepotClients?.data ?? [],
              });

              if (customer) {
                form.setValue("name", customer?.name);
                form.setValue("phone", customer?.phone);
                form.setValue("email", customer?.email);
              }

              if (customer?.address) {
                form.setValue("clientAddress", customer?.address);
              }
            }}
          />

          <>
            {(form.watch("clientId") === undefined ||
              (editClient && form.watch("clientId") !== undefined)) &&
              !form.watch("name").includes("Job #") && (
                <div className="flex flex-col space-y-4 pt-4">
                  <Separator />
                  <p className="text-lg font-semibold leading-7 [&:not(:first-child)]:mt-6">
                    Edit {form.watch("name") ?? "client"}&apos;s details:
                  </p>

                  <InputFormField
                    form={form}
                    name="name"
                    label="Full Name"
                    placeholder="Your driver's name"
                    labelClassName="text-sm font-normal text-muted-foreground"
                  />

                  <AutoCompleteAddressFormField
                    form={form}
                    name="clientAddress.formatted"
                    labelClassName="text-sm font-normal text-muted-foreground"
                    label="Home Address"
                    description="This is where the client typically is located."
                    defaultValue={{
                      formatted: clientAddress?.formatted ?? "",
                      latitude: clientAddress?.latitude ?? 0,
                      longitude: clientAddress?.longitude ?? 0,
                    }}
                  />

                  <InputFormField
                    form={form}
                    name="email"
                    label="Email"
                    type="email"
                    placeholder="e.g. test@test.com"
                    labelClassName="text-sm font-normal text-muted-foreground"
                  />

                  {/* className="resize-none" */}
                  <TextareaFormField
                    form={form}
                    name="notes"
                    label="Notes (optional)"
                    placeholder="e.g. Two boxes of squash"
                    labelClassName="text-sm font-normal text-muted-foreground"
                  />
                </div>
              )}
          </>

          <p className="leading-7 [&:not(:first-child)]:mt-6">
            Or create a new one:
          </p>
          <Button
            className="flex gap-2"
            type="button"
            onClick={() => toastService.inform("TODO: Add new client modal")}
          >
            <UserPlus className="h-4 w-4" />
            Create a new client
          </Button>
        </AccordionContent>
      </ScrollArea>
    </AccordionItem>
  );
};
