import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { useClient } from "~/providers/client";
import { Home, Package, Undo } from "lucide-react";
import { Controller } from "react-hook-form";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { JobType } from "@prisma/client";

import type { StopFormValues } from "~/types.wip";
import { checkAndHighlightErrors } from "~/lib/helpers/highlight-errors";
import { cn } from "~/lib/utils";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  AutoCompleteAddressFormField,
  SelectFormField,
  TextareaFormField,
} from "~/components/inputs";
import { TimeInputFormField } from "~/components/inputs/time-input-form-field";

type Props = {
  form: UseFormReturn<StopFormValues>;
};

export const StopDetailsSection = ({ form }: Props) => {
  const highlightErrors = checkAndHighlightErrors({
    form,
    keys: [
      "address.formatted",
      "prepTime",
      "serviceTime",
      "priority",
      "timeWindowStart",
      "timeWindowEnd",
      "type",
      "order",
      "notes",
    ],
  });

  const [useDefault, setUseDefault] = useState(
    form.getValues("address.formatted") === "" ? false : true,
  );

  const { activeJobData } = useClient();

  const [parent] = useAutoAnimate();

  const address = form.watch("address");

  return (
    <AccordionItem value="item-1" className="group">
      <AccordionTrigger
        className={cn("px-2 text-lg", highlightErrors && "text-red-500")}
      >
        Stop Details
      </AccordionTrigger>
      <ScrollArea
        className={cn(
          "w-full transition-all duration-200 ease-in-out group-data-[state=closed]:h-[0vh] group-data-[state=closed]:opacity-0",
          "group-data-[state=open]:h-[35vh] group-data-[state=open]:opacity-100",
        )}
      >
        <AccordionContent className="px-2">
          <div className="flex flex-col space-y-4">
            {activeJobData && (
              <FormItem className="my-2 flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Address</FormLabel>

                  <FormDescription>
                    <>
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {form.watch("address.formatted")}
                      </span>
                    </>
                  </FormDescription>
                  <FormDescription className="text-xs text-muted-foreground/75">
                    Switch to change the address for this stop.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={useDefault}
                    onCheckedChange={(e: boolean) => {
                      // enableAnimations(e);
                      setUseDefault(e);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
            <div ref={parent} className="flex flex-col gap-4">
              {!useDefault && (
                <AutoCompleteAddressFormField
                  form={form}
                  name="address.formatted"
                  labelClassName="text-sm font-normal text-muted-foreground"
                  label="Job Address"
                  description="This is where the job gets fulfilled. It defaults to the  client's address."
                  defaultValue={{
                    formatted: address?.formatted ?? "",
                    latitude: address?.latitude ?? 0,
                    longitude: address?.longitude ?? 0,
                  }}
                >
                  <>
                    {activeJobData?.job?.address && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              type="button"
                              onClick={() => {
                                form.setValue(
                                  "address",
                                  activeJobData?.job?.address,
                                );
                              }}
                            >
                              <Undo className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Undo address change</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {!!activeJobData?.client?.address && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              type="button"
                              variant={"outline"}
                              onClick={() => {
                                form.setValue(
                                  "address",
                                  activeJobData?.client?.address ?? {
                                    formatted: "",
                                    latitude: 0,
                                    longitude: 0,
                                  },
                                );
                              }}
                            >
                              <Home className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set to home address</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                </AutoCompleteAddressFormField>
              )}
            </div>

            <TimeInputFormField
              form={form}
              name="prepTime"
              label="Prep Time (optional)"
              labelClassName="text-sm font-normal text-muted-foreground"
              description="Any additional time needed before the stop?"
              descriptionClassName="text-xs text-muted-foreground/75"
              unit="min"
            />

            <TimeInputFormField
              form={form}
              name="serviceTime"
              label="Service Time"
              labelClassName="text-sm font-normal text-muted-foreground"
              description="How long should the stop take?"
              descriptionClassName="text-xs text-muted-foreground/75"
              unit="min"
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-muted-foreground">
                    Priority
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(e) => {
                        field.onChange(
                          e === "low" ? 0 : e === "mid" ? 50 : 100,
                        );
                      }}
                      defaultValue={
                        field.value <= 33
                          ? "low"
                          : field.value <= 66
                            ? "mid"
                            : "high"
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem className="w-full">
              <FormLabel className="text-sm font-normal text-muted-foreground">
                Time Window
              </FormLabel>
              <div className="center mt-5 flex flex-col">
                <Controller
                  render={({ field }) => (
                    <div className="flex grow items-center gap-2">
                      <FormLabel className="w-2/12">From </FormLabel>{" "}
                      <Input
                        {...field}
                        placeholder="e.g. 40"
                        type="time"
                        className="w-10/12"
                      />
                    </div>
                  )}
                  name={`timeWindowStart`}
                  control={form.control}
                />
                <Controller
                  render={({ field }) => (
                    <div className="flex grow items-center gap-2">
                      <FormLabel className="w-2/12">To </FormLabel>{" "}
                      <Input
                        {...field}
                        placeholder="e.g. 40"
                        type="time"
                        className="w-10/12"
                      />
                    </div>
                  )}
                  name={`timeWindowEnd`}
                  control={form.control}
                />
              </div>{" "}
              <FormMessage />
            </FormItem>

            <SelectFormField
              form={form}
              name="type"
              label="Stop Type"
              placeholder="Select a type"
              labelClassName="text-sm font-normal text-muted-foreground"
              values={Object.keys(JobType).map((job) => ({
                label: job,
                value: job,
              }))}
            />

            {/* className="resize-none" */}
            <TextareaFormField
              form={form}
              name="order"
              rows={3}
              label="Order Details (Optional)"
              labelClassName="text-sm font-normal text-muted-foreground"
              placeholder="e.g. Two boxes of squash"
            />
          </div>
        </AccordionContent>
      </ScrollArea>
    </AccordionItem>
  );
};
