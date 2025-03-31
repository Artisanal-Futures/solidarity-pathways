"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getColor } from "~/utils/generic/color-handling";
import { cuidToIndex } from "~/utils/generic/format-utils.wip";
import axios from "axios";
import { useSession } from "next-auth/react";
import { Beforeunload } from "react-beforeunload";

import type { OptimizedStop } from "~/types.wip";
import { api } from "~/trpc/react";
import { useOptimizedRoutePlan } from "~/hooks/optimized-data/use-optimized-route-plan";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { DriverVerificationDialog } from "~/components/driver-verification-dialog.wip";
import RouteLayout from "~/components/layout/route-layout";
import { MobileDrawer } from "~/components/mobile/mobile-drawer.wip";
import PageLoader from "~/components/other/page-loader";
import RouteBreakdown from "~/components/route-plan-section/route-breakdown";
import { FieldJobSheet } from "~/components/tracking/field-job-sheet.wip";
import { MessageSheet } from "~/app/[depotId]/route/[routeId]/_components/messaging/message-sheet";

type Props = {
  verifiedDriver: string | null;
};

const LazyRoutingMap = dynamic(() => import("~/components/map/routing-map"), {
  ssr: false,
  loading: () => <PageLoader />,
});

export const OptimizedPathClient = ({ verifiedDriver }: Props) => {
  const { data: session } = useSession();
  const { driverId, routeId } = useSolidarityState();

  const [approval, setApproval] = useState(verifiedDriver !== null);

  const optimizedRoutePlan = useOptimizedRoutePlan();

  const getVehicleById = api.routePlan.getVehicleByIdControlled.useMutation();

  const driver = getVehicleById.mutateAsync({
    routeId,
    vehicleId: optimizedRoutePlan?.data?.vehicleId ?? "",
  });

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
                        driver={void driver}
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
