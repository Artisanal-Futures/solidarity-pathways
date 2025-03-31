import { useEffect, useState } from "react";
import { useClient } from "~/providers/client";
import { useMapStore } from "~/stores/use-map-store";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LocateFixedIcon,
  LocateOffIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";

import { toastService } from "@dreamwalker-studios/toasts";
import { RouteStatus } from "@prisma/client";

import type { OptimizedStop } from "../../types.wip";
import type { EditStopFormValues } from "~/lib/validators/route-plan";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react"; // ?

import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { Button } from "~/components/ui/button";

import { useOptimizedRoutePlan } from "../../hooks/optimized-data/use-optimized-route-plan";

export const MobileDrawer = () => {
  const {
    flyToDriver,
    setFlyToDriver,
    constantTracking,
    setConstantTracking,
    locationMessage, // use-map.tsx uses setLocationMessage
  } = useMapStore();

  const toggleFlyToTimer = () => {
    console.log("Should be changing the button text!");
    setFlyToDriver(!flyToDriver);
  };

  const toggleConstantTracking = () => {
    setConstantTracking(!constantTracking);
  };

  const optimizedRoutePlan = useOptimizedRoutePlan();

  const apiContext = api.useUtils();

  const updateStopStatus = api.routePlan.updateOptimizedStopState.useMutation({
    onSuccess: ({ message }) => toastService.success(message),
    onError: (error) =>
      toastService.error({
        message:
          error?.message ?? "There was an issue updating the stop status.",
        error,
      }),
    onSettled: () => {
      onFieldJobSheetOpen(false);
      void apiContext.routePlan.invalidate();
    },
  });

  const { data: routePlan } = useOptimizedRoutePlan();

  const { onFieldJobSheetOpen } = useClient();
  const { routeId } = useSolidarityState();

  const getRouteJobs = api.routePlan.getJobBundles.useQuery(
    { routeId },
    { enabled: !!routeId },
  );

  const jobsForRoute = routePlan?.stops
    .map((stop) => {
      const jobBundle = getRouteJobs.data?.find(
        (jobBundle) => jobBundle.job.id === stop.jobId,
      );
      return jobBundle ? jobBundle.job : undefined;
    })
    .filter((job) => job !== undefined);

  const [hasPriorSuccess, setHasPriorSuccess] = useState(false);

  useEffect(() => {
    if (locationMessage.message === "success" && !locationMessage.error) {
      setHasPriorSuccess(true);
    }
  }, [locationMessage]);

  // Exporting a message for @map-view-button to display the Location Services state
  const exportLocationServiceMessage = () => {
    if (!constantTracking) {
      return "GPS";
    }
    if (locationMessage?.message?.includes("initial")) {
      return "🏁 GPS";
    } else if (locationMessage?.message?.includes("timed out")) {
      return "GPS 👀 ";
    } else if (locationMessage.message.includes("success")) {
      if (!locationMessage.error && !hasPriorSuccess) {
        setHasPriorSuccess(true);
        return "GPS 🤷🏾 ";
      } else if (!locationMessage.error && hasPriorSuccess) {
        return "GPS 📡";
      }
    } else {
      return "Locating GPS...";
    }
  };

  const [carouselIndex, setCarouselIndex] = useState(0); // To track the current index of the carousel

  // Assuming `route?.stops` is an array of stops for the route
  const route = optimizedRoutePlan?.data;
  const totalStops = route?.stops?.length ?? 0; // Total number of stops

  // Function to move to the next stop
  const nextStop = () => {
    if (carouselIndex < totalStops) {
      // Check to prevent going beyond the last stop
      setCarouselIndex((carouselIndex + 1) % totalStops);
    }
  };

  // Function to move to the previous stop
  const prevStop = () => {
    setCarouselIndex((carouselIndex - 1 + totalStops) % totalStops);
  };

  const [selectedButton, setSelectedButton] = useState<
    Record<number, "complete" | "failed">
  >({});

  const onSubmit = (
    status: "COMPLETED" | "FAILED" | "PENDING",
    activeStop: OptimizedStop,
  ) => {
    const data: Partial<EditStopFormValues> = {
      status: status,
      deliveryNotes: activeStop?.notes ?? undefined,
    };

    if (activeStop) {
      updateStopStatus.mutate({
        state: status,
        stopId: activeStop.id,
        notes: data.deliveryNotes,
      });
    }
  };

  const renderCarouselContent = () => {
    const activeStop = routePlan?.stops[carouselIndex];
    const handleStopUpdate = (status: "COMPLETED" | "FAILED") => {
      if (activeStop?.jobId) {
        console.log(`Updating stop ${activeStop.jobId} to ${status}`);
        // Find the job related to the activeStop
        const job = jobsForRoute?.find((job) => job.id === activeStop.jobId);
        if (job) {
          // Check if the current status is the same as the new status
          const currentStatus = selectedButton[carouselIndex];
          const newStatus = status === "COMPLETED" ? "complete" : "failed";
          if (currentStatus === newStatus) {
            // If the status is the same as its prevState, set status to PENDING
            onSubmit("PENDING", { ...activeStop, job });
            setSelectedButton((prevState) => ({
              ...prevState,
              [carouselIndex]: "pending",
            }));
          } else {
            // If the status is different, proceed with the update
            onSubmit(status, { ...activeStop, job });
            // Update the selectedButton state for the current stop
            setSelectedButton((prevState) => ({
              ...prevState,
              [carouselIndex]: newStatus,
            }));
          }
        } else {
          console.error("Job not found for activeStop", activeStop);
          // Handle the case where the job is not found
        }
      }

      setTimeout(() => nextStop(), 1000);
    };

    return (
      <>
        {activeStop?.type === "break" ? (
          <div className="flex flex-1 justify-center">
            <Button
              size={"lg"}
              variant="ghost"
              className="w-full"
              onClick={() => handleStopUpdate("COMPLETED")}
            >
              <span className="w-full text-center text-sm font-medium text-gray-700">
                Take a Break
              </span>
            </Button>
          </div>
        ) : activeStop?.type === "start" ? (
          <div className="flex flex-1 justify-center">
            <Button
              size={"lg"}
              variant="ghost"
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                if (optimizedRoutePlan?.data?.id) {
                  optimizedRoutePlan.updateRoutePathStatus({
                    pathId: optimizedRoutePlan.data.id,
                    state: RouteStatus.IN_PROGRESS,
                  });
                  setTimeout(() => nextStop(), 500);
                }
              }}
            >
              <span className="w-full text-center text-sm font-medium text-gray-700">
                Start Driving
              </span>
            </Button>
          </div>
        ) : activeStop?.type === "end" ? (
          <div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (optimizedRoutePlan?.data?.id) {
                  optimizedRoutePlan.updateRoutePathStatus({
                    pathId: optimizedRoutePlan.data.id,
                    state: RouteStatus.COMPLETED,
                  });
                }
              }}
              style={{
                color: "blue",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Complete route
            </a>
          </div>
        ) : activeStop?.type !== "end" ? ( // a typical stop
          <div className="flex flex-1 justify-center">
            <Button
              size={"lg"}
              variant="ghost"
              className="border border-gray-300"
              style={{
                backgroundColor:
                  selectedButton[carouselIndex] === "complete"
                    ? "lightgreen"
                    : "initial",
              }}
              onClick={() => handleStopUpdate("COMPLETED")}
            >
              <ThumbsUpIcon />
            </Button>

            <Button
              size={"lg"}
              variant="ghost"
              className="border border-gray-200"
              style={{
                backgroundColor:
                  selectedButton[carouselIndex] === "failed"
                    ? "tomato"
                    : "initial",
              }}
              onClick={() => handleStopUpdate("FAILED")}
            >
              <ThumbsDownIcon />
            </Button>
          </div>
        ) : null}
      </>
    );
  };

  // const renderStopAddress = () => {
  //   const activeStop = routePlan?.stops[carouselIndex];

  //   let stopDetails = <div>Address not available</div>;
  //   if (activeStop?.jobId) {
  //     const job = jobsForRoute.find((job) => job.id === activeStop.jobId);
  //     if (job) {
  //       const clientName = job.client?.name;
  //       const address = job.address.formatted.split(',')[0] ?? "Address not available";
  //       stopDetails = clientName ? (
  //         <>
  //           <div style={{ fontSize: 'larger' }}>{clientName}</div>
  //           <div style={{ fontSize: 'smaller' }}>{address}</div>
  //         </>
  //       ) : (
  //         <div>{address}</div>
  //       );
  //     }
  //   } else {
  //     //stopDetails = <div>{activeStop?.type ?? "Stop type not available"}</div>;
  //     // I think we can let the renderCarouselContent handle
  //     // non stop related actions, like Start, Break, and End. Otherwise
  //     // we're kidn of duplicating information?
  //     stopDetails = '';
  //   }

  //   return (
  //     <div>
  //       {stopDetails}
  //     </div>
  //   );
  // }

  const renderStopAddress = () => {
    const activeStop = routePlan?.stops[carouselIndex];

    let stopDetails = <div>Address not available</div>;
    if (activeStop?.jobId) {
      const job = jobsForRoute?.find((job) => job.id === activeStop.jobId);
      if (job) {
        const clientName = job.client?.name;

        const address =
          job.address.formatted.split(",")[0] ?? "Address not available";

        const handleAddressClick = (e) => {
          e.preventDefault();
          const encodedAddress = encodeURIComponent(address + "Detroit, MI");
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

          window.open(mapsUrl, "_blank");
        };

        stopDetails = clientName ? (
          <>
            <div style={{ fontSize: "larger" }}>{clientName}</div>
            <div style={{ fontSize: "smaller" }}>
              <a
                href="#"
                onClick={handleAddressClick}
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                {address}
              </a>
            </div>
          </>
        ) : (
          <div>
            <a
              href="#"
              onClick={handleAddressClick}
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              {address}
            </a>
          </div>
        );
      }
    } else {
      stopDetails = "";
    }

    return <div>{stopDetails}</div>;
  };

  // const renderStopAddress = () => {
  //   const activeStop = routePlan?.stops[carouselIndex]

  //   let stopAddress = "Address not available";
  //   if (activeStop?.jobId) {
  //     const job = jobsForRoute.find((job) => job.id === activeStop.jobId);
  //     if (job) {
  //       stopAddress = job.address.formatted.split(',')[0] ?? "Address not available";
  //     }
  //   }
  //   else {
  //     stopAddress = activeStop?.type ?? "Stop type not available";
  //   }

  //   return (
  //     <div>
  //       {stopAddress}
  //     </div>
  //   )
  // }

  return (
    <>
      {/* Driver top pane */}
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        {/* Address pane */}
        <section className="flex flex-1 flex-col max-md:h-full lg:flex-row">
          <div className="flex w-full">
            {/* Column 1 - 10% width */}
            <div className="flex-1" style={{ flexBasis: "10%" }}>
              <Button
                className={cn(
                  locationMessage.error && "bg-red-150",
                  locationMessage.message.includes("timed") && "animate-pulse",
                )}
                variant={constantTracking ? "secondary" : "default"}
                onClick={() => {
                  toggleConstantTracking();
                }}
              >
                {exportLocationServiceMessage()}
              </Button>
            </div>

            {/* Column 2 - 40% width */}
            <div
              className="flex items-center justify-center"
              style={{ flexBasis: "80%" }}
            >
              {renderStopAddress()}
            </div>

            {/* Column 3 - 10% width */}
            <div
              className="flex items-center justify-end"
              style={{ flexBasis: "10%" }}
            >
              <Button onClick={toggleFlyToTimer}>
                {flyToDriver ? <LocateFixedIcon /> : <LocateOffIcon />}
              </Button>
            </div>
          </div>
        </section>
        {/* END Address */}

        {/* Carousel pane */}
        <section className="flex flex-1 flex-col max-md:h-full lg:flex-row">
          <div className="flex w-full">
            {/* Column 1 - 10% width */}
            <div className="flex-1" style={{ flexBasis: "10%" }}>
              <Button size={"lg"} variant="ghost">
                <ChevronLeftIcon
                  onClick={prevStop}
                  className="h-6 w-6 text-gray-600"
                />
              </Button>
            </div>

            {/* Column 2 - 40% width */}
            <div
              className="flex items-center justify-center"
              style={{ flexBasis: "80%" }}
            >
              {renderCarouselContent()}
            </div>

            {/* Column 3 - 10% width */}
            <div
              className="flex items-center justify-end"
              style={{ flexBasis: "10%" }}
            >
              <Button size={"lg"} variant="ghost">
                <ChevronRightIcon
                  onClick={nextStop}
                  className="h-6 w-6 text-gray-600"
                />
              </Button>
            </div>
          </div>
        </section>
        {/* END Carousel */}
      </div>
      {/* END Driver top pane */}
    </>
  );
};
