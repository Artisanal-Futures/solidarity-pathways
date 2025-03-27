import type { GetServerSidePropsContext } from "next";

import { UserPlus } from "lucide-react";

import { AbsolutePageLoader } from "~/components/absolute-page-loader";
import { Button } from "~/components/ui/button";

import { HomePageOnboardingCard } from "~/app/_components//overview/homepage-onboarding-card.wip";
import { HomePageOverviewCard } from "~/app/_components//overview/homepage-overview-card.wip";
import { RouteCalendar } from "~/app/_components//overview/route-calendar.wip";

import { DriverVehicleSheet } from "~/app/_components//sheet-driver";

import RouteLayout from "~/app/_components//layout/route-layout";

import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";

import { ImportDriversButton } from "~/app/_components//overview/import-drivers-button";

import { CreateRouteButton } from "~/app/_components//overview/create-route-button";

import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";

import { AddNewDataPopover } from "~/app/_components//layout/add-new-data-popover";
import { PathwaySettingsButton } from "~/app/_components//overview/pathways-settings-button";
import { useMediaQuery } from "~/hooks/use-media-query";
import { authenticateRoutingServerSide } from "~/utils/authenticate-user";

const PathwaysDepotOverviewPage = () => {
  const { sessionStatus } = useSolidarityState();

  const { onSheetOpenChange } = useDriverVehicleBundles();

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const addSingleDriver = () => onSheetOpenChange(true);

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
const validateDate = (ctx: GetServerSidePropsContext) => {
  const { depotId, date, welcome } = ctx.query;

  if (!date)
    return {
      redirect: {
        destination: `/tools/solidarity-pathways/${
          depotId as string
        }/overview?date=${new Date().toDateString().replace(/\s/g, "+")}${
          welcome ? `&welcome=${welcome as string}` : ""
        }`,
        permanent: false,
      },
    };

  return {
    props: {},
  };
};

export const getServerSideProps = async (ctx: GetServerSidePropsContext) =>
  authenticateRoutingServerSide(ctx, false, validateDate);

export default PathwaysDepotOverviewPage;
