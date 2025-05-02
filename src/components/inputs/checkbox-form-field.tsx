import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { cn } from "~/lib/utils";
import { Checkbox } from "~/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

type Props<CurrentForm extends FieldValues> = {
  form: UseFormReturn<CurrentForm>;
  name: Path<CurrentForm> & string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  bodyClassName?: string;
  inputId?: string;
  items: {
    id: string;
    label: string;
  }[];
};

export const CheckboxFormField = <CurrentForm extends FieldValues>({
  form,
  name,
  label,
  description,
  className,
  disabled,
  bodyClassName,
  items,
}: Props<CurrentForm>) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem className={cn("col-span-full", className)}>
          <div className="mb-4">
            {label && <FormLabel>{label}</FormLabel>}
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <div className={cn(bodyClassName)}>
            {items.map((item) => (
              <FormField
                key={item.id}
                control={form.control}
                name={name}
                render={({ field }) => {
                  return (
                    <FormItem
                      key={item.id}
                      className={cn(
                        "flex flex-row items-start space-x-3 space-y-0",
                      )}
                    >
                      <FormControl>
                        <Checkbox
                          checked={
                            Array.isArray(field.value) &&
                            (field.value as string[]).includes(item.id)
                          }
                          disabled={disabled}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value as string[];
                            return checked
                              ? field.onChange([...currentValue, item.id])
                              : field.onChange(
                                  currentValue.filter(
                                    (value) => value !== item.id,
                                  ),
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {item.label}
                      </FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
};
