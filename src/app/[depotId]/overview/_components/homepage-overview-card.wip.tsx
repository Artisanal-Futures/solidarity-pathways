"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { api } from "~/trpc/react";
import { useDepot } from "~/hooks/depot/use-depot";
import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const HomePageOverviewCard = () => {
  const { depotId, routeDate, dateParam } = useSolidarityState();
  const router = useRouter();
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["routePlan", "job", "vehicle"],
  });

  const { currentDepot } = useDepot();

  const createRoutePlan = api.routePlan.create.useMutation({
    ...defaultActions,
    onSuccess: ({ data, message }) => {
      defaultActions.onSuccess({ message });
      void router.push(`/${depotId}/route/${data.id}?mode=plan`);
    },
  });
  const getAllRoutesByDate = api.routePlan.getAllByDate.useQuery(
    {
      date: routeDate ?? new Date(),
      depotId,
    },
    {
      enabled: !!depotId && !!dateParam,
    },
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      manuallyCreateRoute();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const manuallyCreateRoute = () =>
    createRoutePlan.mutate({ depotId, date: routeDate });

  const finalizedRoutes =
    getAllRoutesByDate?.data?.filter((route) => route.optimizedRoute.length > 0)
      .length ?? null;

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
