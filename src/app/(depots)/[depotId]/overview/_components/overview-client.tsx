import { AbsolutePageLoader } from "~/components/absolute-page-loader";

import { HomePageOnboardingCard } from "~/components/overview/homepage-onboarding-card.wip";
import { HomePageOverviewCard } from "~/components/overview/homepage-overview-card.wip";
import { RouteCalendar } from "~/components/overview/route-calendar.wip";

import { DriverVehicleSheet } from "~/components/sheet-driver";

import RouteLayout from "~/components/layout/route-layout";

import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";

import { AddNewDataPopover } from "~/components/layout/add-new-data-popover";

import { useMediaQuery } from "~/hooks/use-media-query";

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
