"use client";

import { useDriver } from "~/providers/driver";
import { Plus, UserPlus } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { PathwaysSettingsMenu } from "~/components/settings/pathways-settings-menu";
import { ImportDriversButton } from "~/app/[depotId]/overview/_components/import-drivers-button";

export const AddNewDataPopover = () => {
  const { onSheetOpenChange } = useDriver();

  const addSingleDriver = () => onSheetOpenChange(true);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-8 right-8 h-20 w-20 rounded-full lg:hidden"
        >
          <Plus className="h-8 w-8" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-fit">
        <div className="">
          <div className="flex flex-col items-start bg-white text-left">
            <Button
              className="mx-0 flex gap-2 px-0"
              variant={"link"}
              onClick={addSingleDriver}
            >
              <UserPlus />
              Add Drivers
            </Button>
            <ImportDriversButton />

            <PathwaysSettingsMenu
              buttonClassName="mx-0 flex gap-2 px-0"
              buttonVariant="link"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
