import { useEffect, useRef, useState } from "react";
import { Copy, Delete } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
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

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

type Props = PopoverTriggerProps & {
  listRef: React.RefObject<HTMLElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  handleOnDuplicateJobs: () => void;
  handleOnDeleteJobs: () => void;
};

export const SearchSelectOptions = ({
  className,
  listRef,
  inputRef,
  handleOnDuplicateJobs,
  handleOnDeleteJobs,
}: Props) => {
  const [open, setOpen] = useState(false);
  const altListRef = useRef(null);
  useEffect(() => {
    function listener(e: KeyboardEvent) {
      if (e.key === "k" && e.metaKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }

    document.addEventListener("keydown", listener);

    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, []);

  useEffect(() => {
    function listener(e: KeyboardEvent) {
      if (e.key === "Enter" && e.metaKey) {
        e.preventDefault();
        handleOnDuplicateJobs();
      }
    }

    document.addEventListener("keydown", listener);

    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [handleOnDuplicateJobs]);

  useEffect(() => {
    function listener(e: KeyboardEvent) {
      if (e.key === "Delete" && e.metaKey) {
        e.preventDefault();
        handleOnDeleteJobs();
      }
    }

    document.addEventListener("keydown", listener);

    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [handleOnDeleteJobs]);

  useEffect(() => {
    const el = listRef.current;

    if (!el) return;

    if (open) {
      el.style.overflow = "hidden";
    } else {
      el.style.overflow = "";
    }
  }, [open, listRef]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 500);
    }
  }, [open]);

  const altInputRef = useRef<HTMLInputElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <p className="text-sm text-muted-foreground">
            Click for Options or Press{" "}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </p>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        side="top"
        align="end"
        sideOffset={16}
        alignOffset={0}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          inputRef?.current?.focus();
        }}
      >
        <Command className="z-[9999]">
          <CommandList className="" ref={altListRef}>
            <CommandGroup heading="Options">
              <CommandItem
                className="flex justify-between text-sm"
                onSelect={handleOnDuplicateJobs}
              >
                <span className="flex">
                  {" "}
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Selected to Route{" "}
                </span>
                <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>↵
                </kbd>
              </CommandItem>{" "}
              <CommandItem
                className="flex justify-between text-sm"
                onSelect={handleOnDeleteJobs}
              >
                {" "}
                <span className="flex">
                  <Delete className="mr-2 h-4 w-4" />
                  Delete Jobs from Current Route{" "}
                </span>{" "}
                <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>Del
                </kbd>
              </CommandItem>{" "}
            </CommandGroup>
          </CommandList>

          <CommandInput
            placeholder="Search for options..."
            className="border-0 ring-0 focus:ring-0"
            ref={altInputRef}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
};
