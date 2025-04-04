"use client";

import type { UseFormReturn } from "react-hook-form";
import { uniqueId } from "lodash";
import { Plus, Trash } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";

import type { DriverFormValues } from "~/lib/validators/driver-form";
import { checkAndHighlightErrors } from "~/lib/helpers/highlight-errors";
import { cn } from "~/lib/utils";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";

type Props = {
  form: UseFormReturn<DriverFormValues>;
};

export const ShiftDetailsSection = ({ form }: Props) => {
  const highlightErrors = checkAndHighlightErrors({
    form,
    keys: ["shiftStart", "shiftEnd", "breaks"],
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "breaks",
  });

  return (
    <AccordionItem value="item-3" className="group">
      <AccordionTrigger
        className={cn("px-2 text-lg", highlightErrors && "text-red-500")}
      >
        Shift Details
      </AccordionTrigger>
      <ScrollArea
        className={cn(
          "w-full transition-all duration-200 ease-in-out group-data-[state=closed]:h-[0vh] group-data-[state=closed]:opacity-0",
          "group-data-[state=open]:h-[35vh] group-data-[state=open]:opacity-100",
        )}
      >
        <AccordionContent className="px-2">
          <div className="flex flex-col space-y-4">
            <FormItem className="w-full">
              <FormLabel className="text-sm font-normal text-muted-foreground">
                Driver Shift
              </FormLabel>
              <div className="center mt-5 flex flex-col">
                <Controller
                  render={({ field }) => (
                    <div className="flex grow items-center gap-2">
                      <FormLabel className="w-2/12">Start </FormLabel>{" "}
                      <Input
                        {...field}
                        placeholder="e.g. 40"
                        type="time"
                        className="w-10/12"
                      />
                    </div>
                  )}
                  name={`shiftStart`}
                  control={form.control}
                />
                <Controller
                  render={({ field }) => (
                    <div className="flex grow items-center gap-2">
                      <FormLabel className="w-2/12">End </FormLabel>{" "}
                      <Input
                        {...field}
                        placeholder="e.g. 40"
                        type="time"
                        className="w-10/12"
                      />
                    </div>
                  )}
                  name={`shiftEnd`}
                  control={form.control}
                />
              </div>{" "}
              <FormMessage />
            </FormItem>

            <div className="w-full">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-normal text-muted-foreground">
                  Breaks
                </FormLabel>

                <Button
                  onClick={() =>
                    append({
                      id: parseInt(uniqueId()),
                      duration: 30,
                    })
                  }
                  type="button"
                  size={"icon"}
                  disabled={fields.length >= 3}
                >
                  <Plus className="h-4 w-4" />{" "}
                  <span className="sr-only">Add Break</span>
                </Button>
              </div>
              <ScrollArea className="relative my-2 h-52 flex-col shadow-inner">
                <>
                  {fields.map((item, index) => {
                    return (
                      <div
                        className={cn(
                          "flex flex-col space-y-2 px-4 py-2",
                          index % 2 === 0 ? "bg-slate-200" : "",
                        )}
                        key={item.id}
                      >
                        <div className="space-y-4 pl-2">
                          <Controller
                            render={({ field }) => (
                              <FormItem className="flex w-full items-center gap-2">
                                <FormLabel className="mt-2">
                                  #{index + 1}
                                </FormLabel>

                                <div className="relative flex w-1/2">
                                  <Input
                                    placeholder="e.g. 30"
                                    className="block w-full rounded-md pr-12 text-gray-900 sm:text-sm sm:leading-6"
                                    {...field}
                                    type="number"
                                  />
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">
                                      min
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  onClick={() => remove(index)}
                                  variant="destructive"
                                  className="text-xs"
                                  type="button"
                                  size={"sm"}
                                >
                                  <Trash className="h-4 w-4" />{" "}
                                </Button>

                                <FormMessage />
                              </FormItem>
                            )}
                            name={`breaks.${index}.duration`}
                            control={form.control}
                            defaultValue={Number(item.duration)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              </ScrollArea>
              <FormDescription>
                Add a list of breaks that the driver can take. These will be
                taken at any time during the shift.
              </FormDescription>
              <FormMessage />
            </div>
          </div>
        </AccordionContent>
      </ScrollArea>
    </AccordionItem>
  );
};
