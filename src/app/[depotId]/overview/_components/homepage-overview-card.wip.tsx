/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { format } from "date-fns";

import { useDepot } from "~/hooks/depot/use-depot";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useRoutePlans } from "~/hooks/plans/use-route-plans";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const HomePageOverviewCard = () => {
  const { depotId, routeDate, isFirstTime, sessionStatus } =
    useSolidarityState();

  const { currentDepot } = useDepot();

  const routePlan = useRoutePlans();

  useEffect(() => {
    const timer = setTimeout(() => {
      manuallyCreateRoute();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const manuallyCreateRoute = () =>
    routePlan.create({ depotId, date: routeDate });

  const isUserAuthenticated = !isFirstTime && sessionStatus === "authenticated";
  const finalizedRoutes =
    routePlan.routesByDate?.filter((route) => route.optimizedRoute.length > 0)
      .length ?? null;

  // route.optimizedRoute.length > 0
  if (!isUserAuthenticated) return null;

  return (
    <Card className="w-full max-w-md lg:max-w-xl">
      <CardHeader>
        <CardTitle>Loading map ...</CardTitle>
        <CardDescription>
          {format(routeDate, "MMMM dd yyyy")} • Depot:{" "}
          {currentDepot?.name ?? depotId} •{" "}
          {finalizedRoutes
            ? `Finalized Routes: ${finalizedRoutes}`
            : `No finalized routes yet`}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};
