import { useMemo, useState, type FC } from "react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from "~/components/map-sheet";

import { cn } from "~/lib/utils";

import Link from "next/link";

import { AssignedJobHeaderCard } from "~/components/route-plan-section/assigned-job-header-card";
import RouteBreakdown from "~/components/route-plan-section/route-breakdown";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import type { OptimizedRoutePath, OptimizedStop } from "~/types.wip";
import { getColor } from "~/utils/generic/color-handling";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";

import { useDepot } from "../../hooks/depot/use-depot";
import { useSolidarityState } from "../../hooks/optimized-data/use-solidarity-state";
import { useSolidarityMessaging } from "../../hooks/use-solidarity-messaging";

import { generateDriverPassCode } from "../../utils/server/auth-driver-passcode";

type Props = {
  data: OptimizedRoutePath;
} & React.ComponentProps<typeof Card>;

export const AssignedJobSheet: FC<Props> = ({ data }) => {
  const [open, setOpen] = useState(false);
  const { currentDepot } = useDepot();
  const driverBundles = useDriverVehicleBundles();
  const solidarityMessaging = useSolidarityMessaging();
  const { depotId } = useSolidarityState();

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
  const driver = driverBundles.getVehicleById(
    data?.vehicleId ?? data.vehicleId,
  );

  const onRouteSheetOpenChange = (state: boolean) => {
    if (!state) driverBundles.setActive(null);
    else driverBundles.setActive(data.vehicleId);
    setOpen(state);
  };

  const passcode = driver?.driver?.email
    ? generateDriverPassCode({
        pathId: data.id,
        depotCode: currentDepot!.magicCode,
        email: driver?.driver.email,
      })
    : "";

  return (
    <>
      <Sheet onOpenChange={onRouteSheetOpenChange} open={open}>
        <SheetTrigger asChild>
          <Button
            variant={"ghost"}
            className="my-2 ml-auto flex h-auto w-full p-0 text-left"
          >
            <Card className={cn("w-full hover:bg-slate-50", "")}>
              <AssignedJobHeaderCard {...headerData} />
            </Card>
          </Button>
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
              {/* <Button
                className="flex flex-1 gap-2"
                variant={"outline"}
                disabled={!driver?.driver?.email}
                onClick={() => {
                  if (!driver?.driver?.email) return;
                  solidarityMessaging.messageDriver(driver?.driver?.email);
                }}
              >
                <MessageCircle /> Send Message to {driver?.driver?.name}
              </Button> */}

              <Link
                href={`/tools/solidarity-pathways/${depotId}/route/${data.routeId}/path/${data.id}?driverId=${data.vehicleId}&pc=${passcode}`}
                target="_blank"
              >
                <Button className="">View Route</Button>
              </Link>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
};
