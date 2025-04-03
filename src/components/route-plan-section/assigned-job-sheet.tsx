import { useMemo, useState } from "react";
import Link from "next/link";
import { useDriver } from "~/providers/driver";
import { Copy } from "lucide-react";

import { toastService } from "@dreamwalker-studios/toasts";

import type { OptimizedRoutePath } from "~/types/route";
import type { OptimizedStop } from "~/types/stop";
import { getColor } from "~/utils/generic/color-handling";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";
import { generateDriverPassCode } from "~/utils/server/auth-driver-passcode";
import { cn } from "~/lib/utils";
import { useDepot } from "~/hooks/depot/use-depot";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from "~/components/map-sheet";
import { AssignedJobHeaderCard } from "~/components/route-plan-section/assigned-job-header-card";
import { RouteBreakdown } from "~/components/route-plan-section/route-breakdown";

type Props = {
  data: OptimizedRoutePath;
};

export const AssignedJobSheet = ({ data }: Props) => {
  const [open, setOpen] = useState(false);
  const { currentDepot } = useDepot();

  const { depotId } = useSolidarityState();
  const { setActiveDriverId, findVehicleById } = useDriver();

  const driver = findVehicleById(data?.vehicleId ?? "");

  const color = useMemo(() => getColor(cuidToIndex(data.vehicleId)), [data]);

  const headerData = {
    vehicleId: data.vehicleId,
    startTime: data.startTime,
    routeStatus: data.status,
    endTime: data.endTime,
    distance: data.distance,
    textColor: color?.text ?? "text-black",
    isOnline: false,
    isTracking: false,
  };

  const onRouteSheetOpenChange = (state: boolean) => {
    if (!state) void setActiveDriverId(null);
    else void setActiveDriverId(data.vehicleId);
    setOpen(state);
  };

  const passcode = driver?.driver?.email
    ? generateDriverPassCode({
        pathId: data.id,
        depotCode: currentDepot!.magicCode,
        email: driver?.driver.email,
      })
    : "";

  const routeUrl = `/${depotId}/route/${data.routeId}/path/${data.id}?driverId=${data.vehicleId}&pc=${passcode}`;

  const handleCopyRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(window.location.origin + routeUrl);
    toastService.success("Route URL copied to clipboard");
  };

  return (
    <>
      <Sheet onOpenChange={onRouteSheetOpenChange} open={open}>
        <SheetTrigger asChild>
          <div className="flex items-center gap-2">
            <Button
              variant={"ghost"}
              className="my-2 flex h-auto w-full p-0 text-left"
            >
              <Card className={cn("w-full hover:bg-slate-50", "")}>
                <AssignedJobHeaderCard {...headerData} />
              </Card>
            </Button>
            <div className="flex flex-col gap-2">
              <Link href={routeUrl} target="_blank">
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleCopyRoute}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetTrigger>

        {data && (
          <SheetContent className="radix-dialog-content flex w-full max-w-full flex-col sm:w-full sm:max-w-full md:max-w-md lg:max-w-lg">
            <SheetHeader className="text-left">
              <AssignedJobHeaderCard {...headerData} className="shadow-none" />
            </SheetHeader>
            <RouteBreakdown
              steps={data.stops as OptimizedStop[]}
              color={color.background}
              driver={driver}
            />
            <SheetFooter className="flex flex-row gap-2">
              <Link href={routeUrl} target="_blank">
                <Button className="">View Route</Button>
              </Link>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
};
