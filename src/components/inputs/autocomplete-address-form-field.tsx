import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";

import type { Address } from "~/types/geolocation";
import { cn } from "~/lib/utils";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

import { AddressAutoComplete } from "../shared/address-auto-complete";

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
  defaultValue?: Address;
  children?: React.ReactNode;
  onSelectAdditional?: (address: Address) => void;
};

export const AutoCompleteAddressFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  defaultValue,
  children,
  onSelectAdditional,
}: Props<CurrentForm>) => {
  const onAddressSelect = (address: Address) => {
    form.setValue(
      name.replace(".formatted", "") as Path<CurrentForm>,
      address as PathValue<CurrentForm, Path<CurrentForm>>,
    );
    onSelectAdditional?.(address);
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({}) => (
        <FormItem className={cn("col-span-full", className)}>
          {label && (
            <FormLabel className={cn(labelClassName)}>{label}</FormLabel>
          )}

          <div className="flex gap-1">
            <AddressAutoComplete
              onSelect={onAddressSelect}
              initialAddress={defaultValue}
            />
            {children}
          </div>

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
