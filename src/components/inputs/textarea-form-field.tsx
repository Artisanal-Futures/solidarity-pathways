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
import { Textarea } from "~/components/ui/textarea";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm>;
  label: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  labelClassName?: string;
};

export const TextareaFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  defaultValue,
  rows,
  disabled,
  placeholder,
  labelClassName,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("col-span-full", className)}>
          <FormLabel className={cn(labelClassName)}>{label}</FormLabel>
          <FormControl>
            <Textarea
              disabled={disabled}
              defaultValue={defaultValue}
              placeholder={placeholder ?? ""}
              rows={rows}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
