import { useAutoAnimate } from "@formkit/auto-animate/react";
import { format } from "date-fns";
import { FilePlus, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { useEffect, useMemo } from "react";
import { clientJobUploadOptions } from "~/data/stop-data";

import { useSolidarityState } from "~/hooks/optimized-data/use-solidarity-state";
import { useRoutePlans } from "~/hooks/plans/use-route-plans";
import type { ClientJobBundle } from "~/types.wip";

import { useDepot } from "../../hooks/depot/use-depot";
import { useCreateJob } from "../../hooks/jobs/CRUD/use-create-job";
import { useReadJob } from "../../hooks/jobs/CRUD/use-read-job";
import { formatNthDate, isDateToday } from "../../utils/current-date";
import { FileUploadModal } from "../shared/file-upload-modal.wip";
import { HomepageRouteCard } from "./homepage-route-card";

export const HomePageOverviewCard = ({}: { date?: Date }) => {
  const { depotId, routeDate, isFirstTime, sessionStatus } =
    useSolidarityState();

  const { currentDepot } = useDepot();

  const routePlan = useRoutePlans();
  const { createNewJobs } = useCreateJob();
  const { routeJobs } = useReadJob();

  const dateTitle = useMemo(
    () => (isDateToday(routeDate) ? "today" : formatNthDate(routeDate)),
    [routeDate],
  );

  const baseRouteUrl = `/tools/solidarity-pathways/${depotId}/route/`;

  const [parent] = useAutoAnimate();
  const [another] = useAutoAnimate();

  useEffect(() => {
    const timer = setTimeout(() => {
      manuallyCreateRoute();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const manuallyCreateRoute = () =>
    routePlan.create({ depotId, date: routeDate });

  const clientJobImportOptions = clientJobUploadOptions({
    jobs: routeJobs,
    setJobs: createNewJobs,
  });

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
