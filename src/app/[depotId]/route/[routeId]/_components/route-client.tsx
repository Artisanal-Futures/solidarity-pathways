"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notificationService } from "~/services/notification";
import {
  ArrowRight,
  Building,
  Calendar,
  Loader2,
  Pencil,
  PencilIcon,
  PlusCircle,
  Rocket,
  Send,
} from "lucide-react";

// Route among lasso selections
import { toastService } from "@dreamwalker-studios/toasts";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import type { Customer } from "~/types";
import { pusherClient } from "~/lib/soketi/client";
import { api } from "~/trpc/react";
import { useClientJobBundles } from "~/hooks/jobs/use-client-job-bundles";
import { useStopsStore } from "~/hooks/jobs/use-stops-store";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useRoutePlans } from "~/hooks/plans/use-route-plans";
import { useMassMessage } from "~/hooks/use-mass-message";
import { useUrlParams } from "~/hooks/use-url-params";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent } from "~/components/ui/tabs";
import { AbsolutePageLoader } from "~/components/absolute-page-loader";
import RouteLayout from "~/components/layout/route-layout";
import { ViewPathsMobileDrawer } from "~/components/mobile/view-paths-mobile-drawer";
import CalculationsTab from "~/components/route-plan-section/calculations-tab";
import { JobClientSheet } from "~/components/sheet-job/job-client-sheet";
import { StopsTab } from "~/components/stops-section/stops-tab";
import { DriverVehicleSheet } from "~/app/[depotId]/_components/sheet-driver/driver-vehicle-sheet";
import { MessageSheet } from "~/app/[depotId]/route/[routeId]/_components/messaging/message-sheet";

import { makeOneClientJob } from "../_utils/make-one-client-job";
import { DriversTab } from "./drivers-tab";
import { PlanMobileDrawer } from "./plan-mobile-drawer";

const LazyRoutingMap = dynamic(() => import("~/components/map/routing-map"), {
  ssr: false,
  loading: () => <div>loading...</div>,
});
/**
 * Page component that allows users to generate routes based on their input.
 */
export const RouteClient = () => {
  const apiContext = api.useUtils();
  const { routeId } = useSolidarityState();

  const buildJobsMutation = api.clients.import.useMutation({
    onSuccess: ({ data, message }) => {
      toastService.success(message);

      data?.forEach((jobData: Customer) => {
        const one_job = makeOneClientJob(jobData);
        jobs.create({
          job: one_job,
          addToRoute: true,
        });

        console.log(
          "**** buildManyJobs ...",
          one_job.client.name,
          one_job.job.id,
        );
      });
    },
    onError: (error) => toastService.error(error?.message),
    onSettled: () => void apiContext.clients.invalidate(),
  });

  const clearOptimizedStops =
    api.routePlan.clearOptimizedStopsFromRoute.useMutation({
      onSuccess: ({ message }) => toastService.success(message),
      onError: (error) => toastService.error(error?.message),
      onSettled: () => void apiContext.routePlan.invalidate(),
    });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const { updateUrlParams, getUrlParam } = useUrlParams();

  const [parent] = useAutoAnimate();

  const getRouteVehicles = api.routePlan.getVehicleBundles.useQuery(
    { routeId },
    { enabled: !!routeId },
  );

  const jobBundles = useClientJobBundles();
  const routePlans = useRoutePlans();

  useEffect(() => {
    pusherClient.subscribe("map");

    pusherClient.bind("evt::notify-dispatch", (message: string) => {
      notificationService.notifyInfo({ message });
    });

    pusherClient.bind("evt::invalidate-stops", (message: string | null) => {
      if (message !== null && message !== "")
        notificationService.notifyInfo({ message });
      void apiContext.routePlan.invalidate();
    });

    pusherClient.bind("evt::invalidate-route", (message: string | null) => {
      if (message !== null && message !== "")
        notificationService.notifyInfo({ message });
      void apiContext.routePlan.invalidate();
    });

    pusherClient.bind("evt::update-route-status", (message: unknown) => {
      notificationService.notifyInfo({
        message: JSON.stringify(message) ?? "Route has been updated",
      });

      void apiContext.routePlan.invalidate();
    });

    return () => {
      pusherClient.unsubscribe("map");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateOptimalPaths = () => {
    if (selectedJobIds.length > 0) {
      updateUrlParams({
        key: "mode",
        value: "calculate",
      });
      void routePlans.calculate(selectedJobIds);
    } else {
      alert(
        "Please select one or more stops before calculating optimal paths.",
      );
    }
  };

  const isRouteDataMissing =
    jobBundles.data.length === 0 || getRouteVehicles?.data?.length === 0;

  const { massSendRouteEmails, isLoading } = useMassMessage();

  const jobs = useClientJobBundles();

  const { setSelectedJobIds, selectedJobIds } = useStopsStore.getState();

  const editRouteCallback = () => {
    const routeId = window.location.pathname.split("/route/")[1];

    clearOptimizedStops.mutate({
      routeId: routeId ?? "",
    });

    setSelectedJobIds([]); // reset them

    console.log("need to start clearing things here");

    updateUrlParams({
      key: "mode",
      value: "plan",
    });
  };

  return (
    <>
      <RouteLayout>
        <div className="flex flex-col">
          <div className="p-1">
            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="hover:bg-dark-gray bg-black text-white"
            >
              <PencilIcon /> {showAdvanced ? "Close" : "Details"}
            </Button>
          </div>

          <div className="p-1">
            <Button
              onClick={() =>
                buildJobsMutation.mutate(routePlans.depot?.magicCode ?? "")
              }
              disabled={buildJobsMutation.isPending}
              className="hover:bg-dark-gray bg-black text-white"
            >
              {buildJobsMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <PlusCircle />
              )}
              Clients
            </Button>
          </div>

          <div className="p-1">
            <Button
              onClick={() => calculateOptimalPaths()}
              className="hover:bg-dark-gray bg-black text-white"
            >
              <Rocket /> Route
            </Button>
          </div>
        </div>
        {/* Tracking related widgets */}
        <DriverVehicleSheet />
        <JobClientSheet />
        <MessageSheet />

        {routePlans.isLoading && <AbsolutePageLoader />}

        {!routePlans.isLoading &&
          routePlans.data &&
          routePlans.optimized &&
          getUrlParam("mode") && (
            <section className="flex flex-1 flex-col-reverse border-2 max-md:h-full lg:flex-row">
              <Tabs
                value={getUrlParam("mode") ?? "plan"}
                onValueChange={(e) => {
                  updateUrlParams({ key: "mode", value: e });
                }}
                ref={parent}
                className={`flex w-full max-w-sm flex-col gap-4 max-lg:hidden max-lg:h-4/6 ${
                  !showAdvanced ? "hidden" : ""
                }`}
              >
                <div className="flex items-center gap-1 px-4 pt-4 text-sm">
                  <Link
                    href={`/${routePlans.data.depotId}/overview`}
                    className="flex gap-1"
                  >
                    <Building className="h-4 w-4" /> Depot{" "}
                    <span className="max-w-28 truncate text-ellipsis">
                      {routePlans.depot?.name ?? routePlans.depot?.id}
                    </span>{" "}
                    /{" "}
                  </Link>
                  <Link
                    href={`/${
                      routePlans.data.depotId
                    }/overview?date=${routePlans.data.deliveryAt
                      .toDateString()
                      .split(" ")
                      .join("+")}`}
                    className="flex gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    {routePlans.data?.deliveryAt.toDateString()}{" "}
                  </Link>
                </div>

                <TabsContent value="plan">
                  <>
                    <DriversTab />
                    <StopsTab />
                    <div className="flex h-16 items-center justify-end gap-2 bg-white p-4">
                      {routePlans.optimized.length === 0 && (
                        <Button
                          onClick={calculateOptimalPaths}
                          className="gap-2"
                          disabled={isRouteDataMissing}
                        >
                          Calculate Routes <ArrowRight />
                        </Button>
                      )}

                      {routePlans.optimized.length !== 0 && (
                        <>
                          <Button
                            variant={"outline"}
                            onClick={() => editRouteCallback()}
                            className="gap-2"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={calculateOptimalPaths}
                            className="flex-1 gap-2"
                            disabled={isRouteDataMissing}
                          >
                            Recalculate Routes <ArrowRight />
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                </TabsContent>
                <TabsContent value="calculate">
                  <>
                    <CalculationsTab />
                    <div className="flex h-16 items-center justify-between gap-2 bg-white p-4">
                      <Button
                        // size="icon"
                        variant={"outline"}
                        className="gap-2"
                        // onClick={() =>
                        //   updateUrlParams({ key: "mode", value: "plan" })
                        // }
                        onClick={editRouteCallback}
                      >
                        <Pencil /> Edit Routes
                      </Button>
                      <Button
                        className="flex-1 gap-2"
                        onClick={massSendRouteEmails}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                        Send to Driver(s)
                      </Button>
                    </div>
                  </>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 p-1 lg:hidden">
                <PlanMobileDrawer />
                <ViewPathsMobileDrawer />
              </div>
              <LazyRoutingMap className="w-full max-md:aspect-square" />
            </section>
          )}

        {!routePlans.isLoading && !routePlans.data && (
          <p className="mx-auto my-auto text-center text-2xl font-semibold text-muted-foreground">
            There seems to an issue when trying to fetch your routing plan.
            Please refresh the page and try again.
          </p>
        )}
      </RouteLayout>
    </>
  );
};
