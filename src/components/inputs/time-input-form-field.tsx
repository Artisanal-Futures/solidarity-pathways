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
import { Input } from "~/components/ui/input";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  inputClassName?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputId?: string;
  type?: string;
  unit?: string;
};

export const TimeInputFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  disabled,
  placeholder,
  onChange,
  onKeyDown,
  inputClassName,
  inputId,
  type,
  unit,
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
            <div className="relative">
              <Input
                className={cn(
                  "block w-full rounded-md py-1.5 pr-12 text-gray-900 sm:text-sm sm:leading-6",
                  inputClassName,
                )}
                type={type}
                disabled={disabled}
                placeholder={placeholder ?? ""}
                {...field}
                onChange={(e) => {
                  if (!!onChange) {
                    onChange(e.target.value);
                  }
                  field.onChange(e.target.value);
                }}
                onKeyDown={onKeyDown}
                id={inputId}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 sm:text-sm">
                  {unit ?? "min"}
                </span>
              </div>
            </div>
          </FormControl>
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
