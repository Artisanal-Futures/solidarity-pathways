import { useDriver } from "~/providers/driver";
import { ChevronRight } from "lucide-react";

import {
  metersToMiles,
  unixSecondsToStandardTime,
} from "~/utils/generic/format-utils.wip";
import { formatWord } from "~/lib/helpers/format-word";
import { cn } from "~/lib/utils";
import { CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { OnlineIndicator } from "~/components/other/online-indicator";

type Props = {
  routeStatus: string;
  startTime: number | null;
  endTime: number | null;
  distance: number | null;
  vehicleId: string;
  textColor?: string;
  isOnline?: boolean;
  isTracking?: boolean;
  isButton?: boolean;
} & React.ComponentProps<typeof CardHeader>;

export const AssignedJobHeaderCard = ({
  vehicleId,
  startTime,
  routeStatus,
  endTime,
  distance,
  textColor,
  className,
  isOnline = false,
  isButton = false,
}: Props) => {
  const { findVehicleById } = useDriver();

  const driverBundle = findVehicleById(vehicleId);

  const status = formatWord(routeStatus);

  return (
    <>
      <CardHeader
        className={cn(
          "flex w-full flex-row items-center justify-between py-1 shadow-inner",
          className,
        )}
      >
        <div>
          <CardTitle className="flex flex-row items-center gap-4 text-sm">
            <div className={cn("flex basis-2/3 font-bold", textColor)}>
              {driverBundle?.driver?.name}
              {/* {routeStatus && "✅"} */}
            </div>
            {isOnline && <OnlineIndicator />}
          </CardTitle>
          <CardDescription className="text-xs">
            <span className="normal-case">{status}</span> •{" "}
            {unixSecondsToStandardTime(startTime ?? 0)} to{" "}
            {unixSecondsToStandardTime(endTime ?? 0)} •{" "}
            {Math.round(metersToMiles(distance ?? 0))}mi
          </CardDescription>{" "}
        </div>
        {isButton && (
          <ChevronRight className="text-slate-800 group-hover:bg-opacity-30" />
        )}
      </CardHeader>
    </>
  );
};
