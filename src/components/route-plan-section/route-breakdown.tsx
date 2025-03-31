import type { ElementType, FC, HTMLAttributes } from "react";
import { useClient } from "~/providers/client";

import type { DriverVehicleBundle, OptimizedStop } from "~/types.wip";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import StepLineSegment from "~/components/other/step-line-segment";

type RouteBreakdownProps = {
  driver: DriverVehicleBundle | null | undefined;
  steps: OptimizedStop[];
  color: string | undefined;
} & HTMLAttributes<ElementType<"div">>;

/**
 * Acts as a timeline breakdown for each stop in the route.
 */
const RouteBreakdown: FC<RouteBreakdownProps> = ({
  driver,
  steps,
  color,
  className,
}) => {
  // const { setSelectedStop } = useDriverRoute((state) => state);

  const { openViewJob } = useClient();

  let jobIndex = 0;

  const startAddress = driver?.vehicle?.startAddress?.formatted ?? "";
  const endAddress =
    driver?.vehicle?.endAddress?.formatted ??
    driver?.vehicle?.startAddress?.formatted ??
    "";

  return (
    <ScrollArea className={cn("flex-1 bg-slate-50 shadow-inner", className)}>
      <div className="w-full px-4">
        {steps?.length > 0 &&
          steps?.map((step, idx) => {
            return (
              <div key={idx} className="w-full">
                {step.type === "job" && (
                  <Button
                    className="m-0 ml-auto flex h-auto w-full p-0"
                    variant={"ghost"}
                    onClick={() => openViewJob(step.jobId)}
                  >
                    <StepLineSegment
                      step={step}
                      idx={++jobIndex}
                      color={color}
                    />{" "}
                  </Button>
                )}
                {step.type === "break" && (
                  <StepLineSegment step={step} color={color} />
                )}
                {step.type === "start" && (
                  <StepLineSegment
                    step={step}
                    shiftStartAddress={startAddress}
                    color={color}
                  />
                )}{" "}
                {step.type === "end" && (
                  <StepLineSegment
                    step={step}
                    shiftEndAddress={endAddress}
                    color={color}
                  />
                )}
              </div>
            );
          })}
      </div>
    </ScrollArea>
  );
};

export default RouteBreakdown;
