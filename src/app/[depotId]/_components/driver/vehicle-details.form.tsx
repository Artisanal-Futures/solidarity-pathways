"use client";

import type { UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import { useDriver } from "~/providers/driver";
import { Home, Repeat, Undo } from "lucide-react";

import { useAutoAnimate } from "@formkit/auto-animate/react";

import type { DriverFormValues } from "~/lib/validators/driver-form";
import { checkAndHighlightErrors } from "~/lib/helpers/highlight-errors";
import { cn } from "~/lib/utils";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { AutoCompleteAddressFormField } from "~/components/inputs";
import { TimeInputFormField } from "~/components/inputs/time-input-form-field";

type Props = { form: UseFormReturn<DriverFormValues> };

export const VehicleDetailsSection = ({ form }: Props) => {
  const highlightErrors = checkAndHighlightErrors({
    form,
    keys: [
      "startAddress.formatted",
      "endAddress.formatted",
      "maxTasks",
      "maxDistance",
      "maxTravelTime",
    ],
  });

  const { activeDriverData } = useDriver();

  const checkForRoundtripAddress =
    form.watch("endAddress.formatted") === "" ||
    form.watch("endAddress.formatted") === form.watch("startAddress.formatted");

  const [useDefault, setUseDefault] = useState(checkForRoundtripAddress);

  const [parent] = useAutoAnimate();

  useEffect(() => {
    if (useDefault) {
      form.setValue("endAddress", {
        formatted: "",
        latitude: undefined,
        longitude: undefined,
      });
    }
  }, [useDefault, form]);

  const isVehicleRoundTrip =
    form.watch("endAddress.formatted") ===
      form.watch("startAddress.formatted") ||
    form.watch("endAddress.formatted") === "";

  const startAddress = form.watch("startAddress");
  const endAddress = form.watch("endAddress");

  return (
    <AccordionItem value="item-2" className="group">
      <AccordionTrigger
        className={cn("px-2 text-lg", highlightErrors && "text-red-500")}
      >
        Vehicle Details
      </AccordionTrigger>
      <ScrollArea
        className={cn(
          "w-full transition-all duration-200 ease-in-out group-data-[state=closed]:h-[0vh] group-data-[state=closed]:opacity-0",
          "group-data-[state=open]:h-[35vh] group-data-[state=open]:opacity-100",
        )}
      >
        <AccordionContent className="px-2">
          <div className="flex flex-col gap-4">
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  {isVehicleRoundTrip ? "Roundtrip" : "Start / End"}
                </FormLabel>

                <FormDescription>
                  {useDefault && (
                    <>
                      <span className="flex items-center gap-1">
                        <Repeat className="h-4 w-4" />
                        {form.watch("startAddress.formatted")}
                      </span>
                    </>
                  )}
                  {!useDefault && (
                    <div className="flex flex-col space-y-0.5">
                      <span className="flex items-center gap-1">
                        {" "}
                        <Home className="h-4 w-4" />{" "}
                        {form.watch("startAddress.formatted")}
                      </span>

                      <span className="flex items-center gap-1">
                        {form.watch("endAddress.formatted") !== "" && (
                          <>
                            <Home className="h-4 w-4" />
                            {form.watch("endAddress.formatted")}
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </FormDescription>
                <FormDescription className="text-xs text-muted-foreground/75">
                  Defaults to the driver&apos;s address.{" "}
                  <span className="font-bold"> Turn off </span>to set a starting
                  and ending address
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={useDefault} onCheckedChange={setUseDefault} />
              </FormControl>
            </FormItem>
            <div ref={parent} className="flex flex-col gap-4">
              {!useDefault && (
                <AutoCompleteAddressFormField
                  form={form}
                  name="startAddress.formatted"
                  labelClassName="text-sm font-normal text-muted-foreground"
                  label="Starting Address"
                  description="This is where the driver typically starts and stops their route."
                  defaultValue={{
                    formatted: startAddress?.formatted ?? "",
                    latitude: startAddress?.latitude ?? 0,
                    longitude: startAddress?.longitude ?? 0,
                  }}
                />
              )}
              {!useDefault && (
                <AutoCompleteAddressFormField
                  form={form}
                  name="endAddress.formatted"
                  labelClassName="text-sm font-normal text-muted-foreground"
                  label="Ending Address (optional)"
                  description="This is where the driver typically starts and stops their route."
                  defaultValue={{
                    formatted: endAddress?.formatted ?? "",
                    latitude: endAddress?.latitude ?? 0,
                    longitude: endAddress?.longitude ?? 0,
                  }}
                >
                  <>
                    {!form.watch("endAddress.formatted") && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              type="button"
                              onClick={() => {
                                form.setValue(
                                  "endAddress",
                                  activeDriverData?.vehicle?.endAddress,
                                );
                              }}
                            >
                              <Undo className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Undo end address change</p>
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
              name="maxTasks"
              label="Max Stops"
              labelClassName="text-sm font-normal text-muted-foreground"
              descriptionClassName="text-xs text-muted-foreground/75"
              description="How many stops can this driver make in one day max?"
              unit="stops"
              type="number"
              placeholder="e.g. 30"
            />
            <TimeInputFormField
              form={form}
              name="maxTravelTime"
              label="Max Travel Time"
              labelClassName="text-sm font-normal text-muted-foreground"
              descriptionClassName="text-xs text-muted-foreground/75"
              description="How long should they be on the road for max?"
              unit="min"
              type="number"
              placeholder="e.g. 30"
            />

            <TimeInputFormField
              form={form}
              name="maxDistance"
              label="Max Distance"
              labelClassName="text-sm font-normal text-muted-foreground"
              descriptionClassName="text-xs text-muted-foreground/75"
              description="What is the furthest max distance you want your driver to travel?"
              unit="miles"
              type="number"
              placeholder="e.g. 30"
            />
          </div>
        </AccordionContent>{" "}
      </ScrollArea>
    </AccordionItem>
  );
};
