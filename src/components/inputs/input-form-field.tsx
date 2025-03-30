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
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputId?: string;
  type?: string;
};

export const InputFormField = <CurrentForm extends FieldValues>({
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
  inputId,
  type,
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
            <Input
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
