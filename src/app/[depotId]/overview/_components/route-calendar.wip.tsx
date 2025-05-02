import type { SelectSingleEventHandler } from "react-day-picker";
import { useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useMediaQuery } from "~/hooks/use-media-query";
import { useUrlParams } from "~/hooks/use-url-params";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export const RouteCalendar = () => {
  const { routeDate, depotId } = useSolidarityState();
  const getAllRoutes = api.routePlan.getAll.useQuery(depotId, {
    enabled: !!depotId,
  });
  const { updateUrlParams } = useUrlParams();

  const dateMap = getAllRoutes?.data?.map((route) => route.deliveryAt);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    setTimeout(() => {
      document.body.style.pointerEvents = "";
    }, 500);
  }, []);

  const updateDate: SelectSingleEventHandler = (date: Date | undefined) => {
    if (!date) return;
    updateUrlParams({
      key: "date",
      value: date.toDateString(),
    });
  };

  if (!isDesktop) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full max-w-md pl-3 text-left font-normal",
              !routeDate && "text-muted-foreground",
            )}
          >
            {routeDate ? format(routeDate, "PPP") : <span>Pick a date</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="mx-auto w-full p-0" align="center">
          <Calendar
            mode="single"
            selected={routeDate}
            onSelect={updateDate}
            className="rounded-md border"
            modifiers={{ route: dateMap ?? [] }}
            modifiersClassNames={{
              route:
                "text-sky-500 aria-selected:bg-sky-500 aria-selected:text-white",
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Calendar
      mode="single"
      selected={routeDate}
      onSelect={updateDate}
      className="rounded-md border"
      modifiers={{ route: dateMap ?? [] }}
      modifiersClassNames={{
        route: "text-sky-500 aria-selected:bg-sky-500 aria-selected:text-white",
      }}
    />
  );
};
