import * as React from "react";
import { useClient } from "~/providers/client";

import { DialogClose } from "@radix-ui/react-dialog";

import { api } from "~/trpc/react";
import { useOptimizedRoutePlan } from "~/hooks/optimized-data/use-optimized-route-plan";
import { useMediaQuery } from "~/hooks/use-media-query";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { CurrentStopForm } from "~/components/tracking/current-stop-form";

export const FieldJobSheet = () => {
  const { activeJobData, isFieldJobSheetOpen, onFieldJobSheetOpen } =
    useClient();
  const optimizedRoutePlan = useOptimizedRoutePlan();

  const currentStop = optimizedRoutePlan?.data?.stops.find(
    (stop) => stop?.jobId === activeJobData?.job.id,
  );

  const currentJob = activeJobData?.job;

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const stopsByAddress = api.routePlan.getOptimizedStopsByAddress.useQuery({
    optimizedRouteId: optimizedRoutePlan.data?.id ?? "",
    address: currentJob?.address.formatted ?? "",
  });

  const activeStop = stopsByAddress.data?.find(
    (stop) => stop.jobId === currentJob?.id,
  );

  if (isDesktop) {
    return (
      <Dialog open={isFieldJobSheetOpen} onOpenChange={onFieldJobSheetOpen}>
        <DialogContent className="lg sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4">
              {" "}
              {currentJob?.address.formatted}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {/* <MapPin className="h-4 w-4" /> */}
              <Badge>{currentJob?.type}</Badge>{" "}
              <Badge>{currentStop?.status}</Badge>
            </DialogDescription>
          </DialogHeader>{" "}
          <div className="relative flex-1 overflow-y-scroll py-4">
            {activeStop && <CurrentStopForm initialData={activeStop} />}
          </div>
          <DialogFooter>
            <DialogClose asChild className="pt-2">
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isFieldJobSheetOpen} onOpenChange={onFieldJobSheetOpen}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle> {currentJob?.address.formatted}</DrawerTitle>
            <DrawerDescription></DrawerDescription>
          </DrawerHeader>
          <DrawerDescription className="flex items-center justify-center gap-2">
            {/* <MapPin className="h-4 w-4" /> */}
            <Badge>{currentJob?.type}</Badge>{" "}
            <Badge>{currentStop?.status}</Badge>
          </DrawerDescription>
          <div className="relative flex-1 overflow-y-scroll py-4">
            {activeStop && <CurrentStopForm initialData={activeStop} />}
          </div>

          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
