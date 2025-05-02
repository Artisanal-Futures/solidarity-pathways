import type { UseFormReturn } from "react-hook-form";

import { DriverType } from "@prisma/client";

import type { DriverFormValues } from "~/lib/validators/driver-form";
import { checkAndHighlightErrors } from "~/lib/helpers/highlight-errors";
import { cn } from "~/lib/utils";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  AutoCompleteAddressFormField,
  InputFormField,
  PhoneFormField,
  SelectFormField,
} from "~/components/inputs";

type Props = {
  form: UseFormReturn<DriverFormValues>;
};

export const DriverDetailsSection = ({ form }: Props) => {
  const highlightErrors = checkAndHighlightErrors({
    form,
    keys: ["name", "email", "phone", "type", "address.formatted"],
  });

  const depotAddress = form.watch("address");
  return (
    <>
      <AccordionItem value="item-1" className="group">
        <AccordionTrigger
          className={cn("px-2 text-lg", highlightErrors && "text-red-500")}
        >
          Driver Details
        </AccordionTrigger>
        <ScrollArea
          className={cn(
            "w-full transition-all duration-200 ease-in-out group-data-[state=closed]:h-[0vh] group-data-[state=closed]:opacity-0",
            "group-data-[state=open]:h-[35vh] group-data-[state=open]:opacity-100",
          )}
        >
          <AccordionContent className="px-2">
            <div className="flex flex-col space-y-4">
              <InputFormField
                form={form}
                name="name"
                label="Full Name"
                placeholder="Your driver's name"
                labelClassName="text-sm font-normal text-muted-foreground"
                className="w-full"
              />

              <AutoCompleteAddressFormField
                form={form}
                name="address.formatted"
                labelClassName="text-sm font-normal text-muted-foreground"
                label="Default Address"
                description="This is where the driver typically starts and stops their route."
                defaultValue={
                  depotAddress ?? {
                    formatted: "",
                    latitude: 0,
                    longitude: 0,
                  }
                }
              />
              <InputFormField
                form={form}
                name="email"
                label="Email"
                placeholder="e.g. test@test.com"
                labelClassName="text-sm font-normal text-muted-foreground"
              />

              <PhoneFormField
                form={form}
                name="phone"
                label="Phone"
                placeholder="+1 (###) ###-####"
                labelClassName="text-sm font-normal text-muted-foreground"
                className="w-full"
              />

              <SelectFormField
                form={form}
                name="type"
                label="Driver Type"
                placeholder="Select a driver type"
                labelClassName="text-sm font-normal text-muted-foreground"
                className="w-full"
                values={Object.keys(DriverType).map((driver) => ({
                  value: driver,
                  label: driver,
                }))}
              />
            </div>
          </AccordionContent>
        </ScrollArea>
      </AccordionItem>
    </>
  );
};
