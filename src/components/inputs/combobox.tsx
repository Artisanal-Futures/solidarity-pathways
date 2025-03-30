"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelect?: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  values: {
    label: string;
    value: string;
    description?: string;
  }[];
};

export const Combobox = ({
  value,
  onChange,
  onSelect,
  label,
  className,
  disabled,
  placeholder,
  values,
}: Props) => {
  return (
    <div className={cn("w-full", className)}>
      <Popover modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
            )}
          >
            {value
              ? (values.find((item) => item.value === value)?.label ??
                `${label} ${value}`)
              : `Select ${placeholder ?? "item"}`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${placeholder ?? "item"}...`} />
            <CommandList>
              <CommandEmpty>No {placeholder ?? "item"} found.</CommandEmpty>
              <CommandGroup>
                {values.map((item) => (
                  <CommandItem
                    value={item.label}
                    key={item.value}
                    onSelect={() => {
                      onChange?.(item.value);
                      onSelect?.(item.value);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        item.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item.label}
                    {item.description && <span>{item.description}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
