"use client";

import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useMediaQuery } from "~/hooks/use-media-query";
import { AbsolutePageLoader } from "~/components/absolute-page-loader";
import { AddNewDataPopover } from "~/components/layout/add-new-data-popover";
import RouteLayout from "~/components/layout/route-layout";

import { DriverVehicleSheet } from "../../_components/sheet-driver/driver-vehicle-sheet";
import { HomePageOnboardingCard } from "./homepage-onboarding-card.wip";
import { HomePageOverviewCard } from "./homepage-overview-card.wip";
import { RouteCalendar } from "./route-calendar.wip";

export const PathwaysDepotOverviewClient = () => {
  const { sessionStatus } = useSolidarityState();

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (sessionStatus === "loading") return <AbsolutePageLoader />;

  return (
    <>
      <DriverVehicleSheet standalone={true} />

      <RouteLayout>
        <section className="flex flex-col-reverse justify-end border-2 max-md:h-full max-md:p-2 md:flex-1 md:justify-center lg:flex-row">
          <div className="relative flex w-full flex-col items-center justify-center space-y-10">
            {!isDesktop && <RouteCalendar />}

            <HomePageOnboardingCard />
            <HomePageOverviewCard />
          </div>
          <AddNewDataPopover />
        </section>{" "}
      </RouteLayout>
    </>
  );
};
