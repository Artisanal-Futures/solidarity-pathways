import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { Controller } from "react-hook-form";

import { cn } from "~/lib/utils";
import {
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

import { AutoCompleteDepotBtn } from "../shared/autocomplete-depot-btn";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputId?: string;
  type?: string;
};

export const DepotAddressFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
}: Props<CurrentForm>) => {
  const setLatLng = (lat: number, lng: number) => {
    form.setValue(
      (name.replace(".formatted", "") + ".latitude") as Path<CurrentForm>,
      lat as PathValue<CurrentForm, Path<CurrentForm>>,
    );
    form.setValue(
      (name.replace(".formatted", "") + ".longitude") as Path<CurrentForm>,
      lng as PathValue<CurrentForm, Path<CurrentForm>>,
    );
  };

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field: { onChange, value } }) => (
        <FormItem className={cn("col-span-full", className)}>
          {label && (
            <FormLabel className={cn(labelClassName)}>{label}</FormLabel>
          )}
          <AutoCompleteDepotBtn<CurrentForm>
            value={value}
            onChange={onChange}
            onLatLngChange={setLatLng}
            form={form}
            formKey={name.replace(".formatted", "")}
          />
          {description && (
            <FormDescription className={cn(descriptionClassName)}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

{
  /* <Controller
name="address.formatted"
control={form.control}
render={({ field: { onChange, value } }) => (
  <FormItem>
    <FormLabel className="text-sm font-normal text-muted-foreground">
      Default Address
    </FormLabel>
    <AutoCompleteDepotBtn<DriverFormValues>
      value={value}
      onChange={onChange}
      onLatLngChange={setLatLng}
      form={form}
      formKey="address"
    />

    <FormDescription className="text-xs text-muted-foreground/75">
      This is where the driver typically starts and stops their
      route.
    </FormDescription>
    <FormMessage />
  </FormItem>
)}
/> */
}

// const setLatLng = (lat: number, lng: number) => {
//     form.setValue("address.latitude", lat);
//     form.setValue("address.longitude", lng);
//   };
