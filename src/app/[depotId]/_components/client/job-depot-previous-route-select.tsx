"use client";

import type { SelectSingleEventHandler } from "react-day-picker";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { checkIfDateIsValid } from "~/lib/helpers/check-if-date-valid";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useFixDismissibleLayer } from "~/hooks/use-fix-dismissible-layer";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

type Props = {
  date: Date | undefined;
  setDate: SelectSingleEventHandler;
};
export const JobDepotPreviousRouteSelect = ({ date, setDate }: Props) => {
  const [open, setOpen] = useState(false);

  const { routeId, depotId } = useSolidarityState();

  const getAllRoutes = api.routePlan.getAll.useQuery(depotId, {
    enabled: !!depotId,
  });

  const dateMap = getAllRoutes?.data?.map((route) => route.deliveryAt);

  const currentRoute = api.routePlan.get.useQuery(routeId, {
    enabled: !!routeId,
  });

  useFixDismissibleLayer();

  const disableInvalidDates = (date: Date) => {
    return checkIfDateIsValid(
      date,
      currentRoute?.data?.deliveryAt ?? new Date(),
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full pl-3 text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          {date ? format(date, "PPP") : <span>Pick a date</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
          disabled={disableInvalidDates}
          modifiers={{ route: dateMap ?? [] }}
          modifiersClassNames={{
            route:
              "text-sky-500 aria-selected:bg-sky-500 aria-selected:text-white",
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
