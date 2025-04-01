"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useClient } from "~/providers/client";
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

import type { Customer } from "~/types/job";
import { pusherClient } from "~/lib/soketi/client";
import { api } from "~/trpc/react";
import { useDepot } from "~/hooks/depot/use-depot";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useRoutePlans } from "~/hooks/plans/use-route-plans";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { useMassMessage } from "~/hooks/use-mass-message";
import { useUrlParams } from "~/hooks/use-url-params";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent } from "~/components/ui/tabs";
import RouteLayout from "~/components/layout/route-layout";
import { ViewPathsMobileDrawer } from "~/components/mobile/view-paths-mobile-drawer";
import { AbsolutePageLoader } from "~/components/other/absolute-page-loader";
import { CalculationsTab } from "~/components/route-plan-section/calculations-tab";
import { JobClientSheet } from "~/app/[depotId]/_components/client/job-client-sheet";
import { StopsTab } from "~/app/[depotId]/_components/client/stops-tab";
import { DriverVehicleSheet } from "~/app/[depotId]/_components/driver/driver-vehicle-sheet";
import { DriversTab } from "~/app/[depotId]/_components/driver/drivers-tab";

import { makeOneClientJob } from "../_utils/make-one-client-job";
import { PlanMobileDrawer } from "./plan-mobile-drawer";

const LazyRoutingMap = dynamic(() => import("~/components/map/routing-map"), {
  ssr: false,
  loading: () => <div>loading...</div>,
});
/**
 * Page component that allows users to generate routes based on their input.
 */
export const RouteClient = () => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["routePlan"],
  });

  const { routeId, depotId } = useSolidarityState();
  const getRouteJobs = api.job.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const apiContext = api.useUtils();

  const createJobBundles = api.job.createMany.useMutation({
    ...defaultActions,
  });

  const buildJobsMutation = api.clients.import.useMutation({
    onSuccess: ({ data, message }) => {
      toastService.success(message);

      data?.forEach((jobData: Customer) => {
        const one_job = makeOneClientJob(jobData);

        createJobBundles.mutate({
          bundles: [
            {
              job: one_job.job,
              client: one_job.client?.email ? one_job.client : undefined,
            },
          ],
          depotId,
          routeId,
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
    api.routePlan.clearOptimizedStops.useMutation(defaultActions);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const { updateUrlParams, getUrlParam } = useUrlParams();

  const [parent] = useAutoAnimate();

  const getRouteVehicles = api.vehicle.getBundles.useQuery(routeId, {
    enabled: !!routeId,
  });

  const { optimized, calculate } = useRoutePlans();

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
      void calculate(selectedJobIds);
    } else {
      alert(
        "Please select one or more stops before calculating optimal paths.",
      );
    }
  };

  const isRouteDataMissing =
    getRouteJobs?.data?.length === 0 || getRouteVehicles?.data?.length === 0;

  const { massSendRouteEmails, isLoading } = useMassMessage();

  const { setSelectedJobIds, selectedJobIds } = useClient();

  const editRouteCallback = () => {
    const routeId = window.location.pathname.split("/route/")[1];

    clearOptimizedStops.mutate(routeId ?? "");

    setSelectedJobIds([]); // reset them

    console.log("need to start clearing things here");

    updateUrlParams({
      key: "mode",
      value: "plan",
    });
  };

  const { currentDepot } = useDepot();

  const getRoutePlanById = api.routePlan.get.useQuery(routeId, {
    enabled: !!routeId,
  });

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
                buildJobsMutation.mutate(currentDepot?.magicCode ?? "")
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

        {getRoutePlanById.isPending && <AbsolutePageLoader />}

        {!getRoutePlanById.isPending &&
          getRoutePlanById?.data &&
          optimized &&
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
                    href={`/${getRoutePlanById?.data.depotId}/overview`}
                    className="flex gap-1"
                  >
                    <Building className="h-4 w-4" /> Depot{" "}
                    <span className="max-w-28 truncate text-ellipsis">
                      {currentDepot?.name ?? currentDepot?.id}
                    </span>{" "}
                    /{" "}
                  </Link>
                  <Link
                    href={`/${
                      getRoutePlanById?.data.depotId
                    }/overview?date=${getRoutePlanById?.data.deliveryAt
                      .toDateString()
                      .split(" ")
                      .join("+")}`}
                    className="flex gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    {getRoutePlanById?.data?.deliveryAt.toDateString()}{" "}
                  </Link>
                </div>

                <TabsContent value="plan">
                  <>
                    <DriversTab />
                    <StopsTab />
                    <div className="flex h-16 items-center justify-end gap-2 bg-white p-4">
                      {optimized.length === 0 && (
                        <Button
                          onClick={calculateOptimalPaths}
                          className="gap-2"
                          disabled={isRouteDataMissing}
                        >
                          Calculate Routes <ArrowRight />
                        </Button>
                      )}

                      {optimized.length !== 0 && (
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

        {!getRoutePlanById.isPending && !getRoutePlanById?.data && (
          <p className="mx-auto my-auto text-center text-2xl font-semibold text-muted-foreground">
            There seems to an issue when trying to fetch your routing plan.
            Please refresh the page and try again.
          </p>
        )}
      </RouteLayout>
    </>
  );
};
