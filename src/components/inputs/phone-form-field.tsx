import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { cn } from "~/lib/utils";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

import { FormattedNumericInput } from "./formatted-numeric-input";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  labelClassName?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

export const PhoneFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  labelClassName,
  disabled,
  placeholder,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("col-span-full", className)}>
          {label && (
            <FormLabel className={cn(labelClassName)}>{label}</FormLabel>
          )}
          <FormControl>
            <FormattedNumericInput
              {...field}
              disabled={disabled}
              placeholder={placeholder ?? ""}
              type="tel"
              allowEmptyFormatting
              format="+1 (###) ###-####"
              mask="_"
              onChange={(e) => {
                e.preventDefault();
              }}
              onValueChange={(value) => {
                field.onChange(`${value.floatValue}`);
              }}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
