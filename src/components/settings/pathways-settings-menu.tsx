"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bomb, Truck, User } from "lucide-react";

import { DialogClose } from "@radix-ui/react-dialog";

import { api } from "~/trpc/react";
import { useDepot } from "~/hooks/depot/use-depot";
import { useDepotModal } from "~/hooks/depot/use-depot-modal.wip";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";

import { DeleteDialog } from "../delete-dialog";
import { DepotModal } from "./depot-modal";

export const PathwaysSettingsMenu = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "job", "routePlan"],
  });

  const router = useRouter();
  const { currentDepot, deleteDepot } = useDepot();
  const { depotId } = useSolidarityState();

  const onOpen = useDepotModal((state) => state.onOpen);

  const deleteClientsMutation =
    api.customer.deleteAllFromDepot.useMutation(defaultActions);

  const deleteCurrentDepot = () => {
    deleteDepot.mutate(depotId);
  };

  const purgeAllDriversMutation =
    api.driver.deleteAllFromDepot.useMutation(defaultActions);
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solidarity Pathways Settings</DialogTitle>
            <DialogDescription>
              Add and modify your driver data, realtime settings, and more.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="z-50 grid h-96 w-full">
            <div className="flex flex-col space-y-4">
              <div className="flex w-full flex-col space-y-8 rounded-md border border-border bg-background/50 p-4">
                <div>
                  <h4 className="font-semibold">Data Cache</h4>
                  <p className="text-muted-foreground">
                    Handles how driver and stop data is cached (i.e. stored for
                    later use)
                  </p>
                </div>

                <Button
                  onClick={() => {
                    sessionStorage.removeItem("stop-storage");
                    sessionStorage.removeItem("driver-storage");
                    void router.refresh();
                  }}
                >
                  Clear Cache
                </Button>
              </div>

              <div className="flex w-full flex-col space-y-8 rounded-md border border-border bg-background/50 p-4">
                <div>
                  <h4 className="font-semibold">Depot</h4>
                  <p className="text-muted-foreground">
                    Edit your depot settings and details.
                  </p>
                </div>
                <div className="flex gap-4 max-md:flex-col">
                  {currentDepot && (
                    <>
                      <DepotModal initialData={currentDepot ?? null} />
                      <Button onClick={() => onOpen()} className="w-full">
                        Edit Depot
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col space-y-8 rounded-md border border-red-500 bg-red-500/5 p-4">
                <div>
                  <h4 className="font-semibold">Danger</h4>
                  <p className="text-muted-foreground">
                    This literally deletes everything in your depot. I hope you
                    know what you are doing...
                  </p>
                </div>

                <h4 className="font-semibold">Drivers & Clients</h4>

                <div className="flex gap-4 max-md:flex-col">
                  <DeleteDialog
                    onConfirm={() => purgeAllDriversMutation.mutate(depotId)}
                    Icon={Truck}
                    title="Delete Drivers"
                  />

                  <DeleteDialog
                    onConfirm={() => deleteClientsMutation.mutate({ depotId })}
                    Icon={User}
                    title="Delete Clients"
                  />
                </div>

                <h4 className="font-semibold">Depot</h4>

                <DeleteDialog
                  onConfirm={deleteCurrentDepot}
                  Icon={Bomb}
                  title="Delete Depot"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
