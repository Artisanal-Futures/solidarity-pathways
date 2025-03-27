import dynamic from "next/dynamic";
import React, { useEffect, useState, type FC } from "react";
import { Beforeunload } from "react-beforeunload";

import PageLoader from "~/components/ui/page-loader";

import { useSession } from "next-auth/react";
import RouteLayout from "~/app/_components//layout/route-layout";
import { MobileDrawer } from "~/app/_components//mobile/mobile-drawer.wip";
import RouteBreakdown from "~/app/_components//route-plan-section/route-breakdown";
import FieldJobSheet from "~/app/_components//tracking/field-job-sheet.wip";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { useOptimizedRoutePlan } from "~/hooks/optimized-data/use-optimized-route-plan";
import type { OptimizedStop } from "~/types.wip";
import { getColor } from "~/utils/generic/color-handling";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";

interface IProps {
  verifiedDriver: string | null;
}

const LazyRoutingMap = dynamic(
  () => import("~/app/_components//map/routing-map"),
  {
    ssr: false,
    loading: () => <PageLoader />,
  },
);

import type { GetServerSidePropsContext } from "next";

import axios from "axios";
import { DriverVerificationDialog } from "~/app/_components//driver-verification-dialog.wip";

import { MessageSheet } from "~/app/_components//messaging/message-sheet";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";

import { prisma } from "~/server/db";
import {
  createDriverVerificationCookie,
  generateDriverPassCode,
} from "~/utils/server/auth-driver-passcode";

const OptimizedPathPage: FC<IProps> = ({ verifiedDriver }) => {
  const { data: session } = useSession();
  const { driverId } = useSolidarityState();

  const [approval, setApproval] = useState(verifiedDriver !== null);

  const optimizedRoutePlan = useOptimizedRoutePlan();
  const driverRoute = useDriverVehicleBundles();

  const driver = driverRoute.getVehicleById(
    optimizedRoutePlan?.data?.vehicleId,
  );

  const routeColor = getColor(
    cuidToIndex(optimizedRoutePlan?.data?.vehicleId ?? ""),
  );

  useEffect(() => {
    if (approval && driverId)
      axios
        .post("/api/routing/online-driver", {
          vehicleId: driverId,
        })

        .catch((err) => {
          console.error(err);
        });
  }, [approval, driverId]);

  if (!approval && !session?.user)
    return (
      <DriverVerificationDialog approval={approval} setApproval={setApproval} />
    );

  if (approval || session?.user)
    return (
      <>
        <FieldJobSheet />
        <MessageSheet />
        <RouteLayout>
          {optimizedRoutePlan.isLoading ? (
            <PageLoader />
          ) : (
            <>
              {optimizedRoutePlan.data && (
                // flex-col-reverse was the original layout
                <section className="flex flex-1 flex-col border-2 max-md:h-full lg:flex-row">
                  <div className="flex w-full flex-col gap-4 max-lg:hidden max-lg:h-4/6 lg:w-5/12 xl:w-3/12">
                    <>
                      <Beforeunload
                        onBeforeunload={(event) => {
                          event.preventDefault();
                        }}
                      />

                      <RouteBreakdown
                        steps={optimizedRoutePlan.data.stops as OptimizedStop[]}
                        driver={driver}
                        color={routeColor.background}
                      />
                    </>
                  </div>

                  <MobileDrawer />

                  <LazyRoutingMap className="max-md:aspect-square lg:w-7/12 xl:w-9/12" />
                </section>
              )}
            </>
          )}
        </RouteLayout>
      </>
    );
};

export default OptimizedPathPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { pc: passcode } = ctx.query;

  const verifiedDriverCookie = ctx.req.cookies.verifiedDriver;

  if (!passcode && !verifiedDriverCookie)
    return { props: { verifiedDriver: null } };

  try {
    const driver = await prisma.vehicle.findUnique({
      where: { id: ctx.query.driverId as string },
      include: { driver: true },
    });

    const depot = await prisma.depot.findUnique({
      where: { id: ctx.query.depotId as string },
    });

    if (!driver || !depot) throw new Error("Driver or Depot not found");

    const expectedPasscode = generateDriverPassCode({
      pathId: ctx.query.pathId as string,
      depotCode: depot.magicCode,
      email: driver.driver!.email,
    });

    if (verifiedDriverCookie === expectedPasscode)
      return { props: { verifiedDriver: verifiedDriverCookie } };

    if (expectedPasscode !== passcode) throw new Error("Invalid Passcode");

    const cookie = createDriverVerificationCookie({
      passcode: passcode,
      minuteDuration: 720,
    });

    ctx.res.setHeader("Set-Cookie", [cookie]);

    return {
      props: {
        verifiedDriver: passcode,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { verifiedDriver: null },
    };
  }
};
