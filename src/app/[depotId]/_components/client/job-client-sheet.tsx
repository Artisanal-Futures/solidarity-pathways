import { useState } from "react";
import { useClient } from "~/providers/client";
import { Mail, MapPin } from "lucide-react";

import type { ClientJobBundle } from "~/types.wip";
import { api } from "~/trpc/react";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/map-sheet";
import { DataTable } from "~/app/_components/data-sheet/data-table";
import { StopForm } from "~/app/[depotId]/_components/client/stop-form";

import { jobDepotColumns } from "./job-depot-columns";
import { JobDepotPreviousRouteSelect } from "./job-depot-previous-route-select";

export const JobClientSheet = ({ standalone }: { standalone?: boolean }) => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["job", "routePlan"],
  });

  const { depotId, sessionStatus, routeId } = useSolidarityState();

  const createJobBundles = api.job.createMany.useMutation({
    ...defaultActions,
  });

  const {
    activeJobData,
    isJobSheetOpen,
    onSheetOpenChange,
    jobSheetMode,
    setJobSheetMode,
    routeJobs,
  } = useClient();

  const [selectedData, setSelectedData] = useState<ClientJobBundle[]>([]);
  const [date, setDate] = useState<Date>();

  const getStopsByDate = api.routePlan.getStopsByDate.useQuery(
    { date: date!, depotId },
    { enabled: !!date && !!depotId },
  );

  const title = activeJobData
    ? `${activeJobData?.client?.name ?? `Job #${activeJobData?.job?.id}`}`
    : "Add Stop";

  const areDepotOptionsVisible = activeJobData === null && !standalone;

  const areStorageOptionsVisible = activeJobData !== null || standalone;

  const assignPreviousJobsToRoute = () => {
    createJobBundles.mutate({
      bundles: selectedData,
      routeId,
      depotId,
    });
  };

  const { activeJobId } = useClient();

  return (
    <Sheet open={isJobSheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetContent
        side={"left"}
        className="radix-dialog-content flex w-full max-w-full flex-col sm:w-full sm:max-w-full md:max-w-md lg:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="text-center md:text-left">
            {activeLocation}
          </SheetTitle>
          <SheetDescription className="text-center md:text-left">
            {activeJobData ? (
              <>
                <p className="flex w-full flex-1 flex-col border-b border-t py-4 text-sm">
                  <span className="flex items-center gap-2 font-light text-muted-foreground">
                    <MapPin size={15} /> {activeJobData.job.address?.formatted}
                  </span>

                  {activeJobData?.client && (
                    <span className="flex items-center gap-2 font-light text-muted-foreground">
                      <Mail size={15} /> {activeJobData?.client?.email}
                    </span>
                  )}
                </p>
              </>
            ) : (
              `Fill out the table below to start adding destinations to the map. ${JSON.stringify(activeJobData)}`
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Option 1: user is not logged in, can still add via session state */}

        {sessionStatus === "loading" && <p>Loading...</p>}

        {areDepotOptionsVisible && (
          <>
            <Tabs
              className="z-0 w-full"
              value={jobSheetMode}
              onValueChange={setJobSheetMode}
            >
              <TabsList className="flex w-full items-center justify-between">
                <TabsTrigger value="add-previous" className="flex-1">
                  Add Previous
                </TabsTrigger>
                <TabsTrigger value="create-new" className="flex-1">
                  Create New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="add-previous">
                <div className="flex w-full flex-col gap-3 border-b bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      className="flex-1"
                      onClick={assignPreviousJobsToRoute}
                    >
                      Update route jobs
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Select a date to add previous stops
                  </h3>
                  <JobDepotPreviousRouteSelect date={date} setDate={setDate} />
                </div>

                {date && (
                  <DataTable
                    storeData={routeJobs}
                    data={getStopsByDate.data ?? []}
                    setSelectedData={setSelectedData}
                    idAccessor={(row) => row.job.id}
                    accessorKey="job_address"
                    type="job"
                    searchPlaceholder="Search jobs..."
                    columns={jobDepotColumns}
                  />
                )}
              </TabsContent>
              <TabsContent value="create-new">
                <StopForm
                  handleOnOpenChange={onSheetOpenChange}
                  activeLocation={activeJobData}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Option 2: use is logged in and allows for user to select existing drivers
          as well as add new drivers to the database
        */}
        {areStorageOptionsVisible && (
          <StopForm
            handleOnOpenChange={onSheetOpenChange}
            activeLocation={activeJobData}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
