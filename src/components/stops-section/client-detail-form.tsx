import type { UseFormReturn } from "react-hook-form";
import { useMemo } from "react";
import { UserPlus } from "lucide-react";
import { Controller } from "react-hook-form";

import { toastService } from "@dreamwalker-studios/toasts";

import type { StopFormValues } from "~/lib/validators/stop";
import { cn } from "~/lib/utils";
import { useClientJobBundles } from "~/hooks/jobs/use-client-job-bundles";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";

import { InputFormField, SelectFormField, TextareaFormField } from "../inputs";
import { AutoCompleteDepotBtn } from "../shared/autocomplete-depot-btn";

type Props = {
  form: UseFormReturn<StopFormValues>;
  editClient?: boolean;
};

export const ClientDetailsSection = ({ form, editClient }: Props) => {
  const formErrors = form.formState.errors;
  const checkIfFormHasErrors = useMemo(() => {
    const keys = ["clientAddress.formatted", "name", "email", "phone", "notes"];

    const hasErrors = keys.some(
      (key) => formErrors[key as keyof typeof formErrors],
    );
    return hasErrors;
  }, [formErrors]);

  const jobBundles = useClientJobBundles();

  const isClientAssigned = form.watch("clientId") !== undefined;

  return (
    <AccordionItem value="item-2" className="group">
      <AccordionTrigger
        className={cn("px-2 text-lg", checkIfFormHasErrors && "text-red-500")}
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
            disabled={jobBundles?.clients?.length === 0}
            name="clientId"
            label="Client"
            description="Select a client to assign to this job"
            labelClassName="text-sm font-normal text-muted-foreground"
            values={jobBundles?.clients?.map((client) => ({
              label: `${client.name}: ${client?.address?.formatted}`,
              value: client.id,
            }))}
            onValueChange={(value) => {
              const bundle = jobBundles.getClientById(value);

              if (bundle?.client) {
                form.setValue("name", bundle?.client?.name);
                form.setValue("phone", bundle?.client?.phone);
                form.setValue("email", bundle?.client?.email);
                form.setValue(
                  "clientAddress.formatted",
                  bundle?.client?.address?.formatted,
                );
                form.setValue(
                  "clientAddress.latitude",
                  bundle?.client?.address?.latitude,
                );
                form.setValue(
                  "clientAddress.longitude",
                  bundle?.client?.address?.longitude,
                );
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

                  <Controller
                    name="clientAddress.formatted"
                    control={form.control}
                    render={({ field: { onChange, value } }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          Home Address
                        </FormLabel>

                        <AutoCompleteDepotBtn<StopFormValues>
                          value={value}
                          onChange={onChange}
                          form={form}
                          onLatLngChange={(lat, lng) => {
                            form.setValue("clientAddress.latitude", lat);
                            form.setValue("clientAddress.longitude", lng);
                          }}
                          formKey="clientAddress"
                        />

                        <FormMessage />
                      </FormItem>
                    )}
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
