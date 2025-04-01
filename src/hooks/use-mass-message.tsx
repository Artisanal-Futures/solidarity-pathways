"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { api } from "~/trpc/react";

import { generateDriverPassCode } from "../utils/server/auth-driver-passcode";
import { useDepot } from "./depot/use-depot";
import { useSolidarityState } from "./optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "./use-default-mutation-actions";

export const useMassMessage = () => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["routePlan"],
  });
  const { depotId, routeId, pathId } = useSolidarityState();
  const { currentDepot } = useDepot();

  const getRoutePlanData = api.routePlan.get.useQuery(routeId, {
    enabled: false,
  });
  const sendRouteEmails =
    api.routePlan.assignAndNotifyDrivers.useMutation(defaultActions);

  const optimized = getRoutePlanData.data?.optimizedRoute ?? [];

  const getEmailBundles = async () => {
    await getRoutePlanData.refetch();

    const bundles = optimized.map((route) => {
      const passcode = generateDriverPassCode({
        pathId: pathId,
        depotCode: currentDepot?.magicCode ?? "",
        email: route?.vehicle?.driver!.email,
      });

      return {
        email: route?.vehicle?.driver?.email,
        url: `${depotId}/route/${routeId}/path/${route.id}?driverId=${route.vehicleId}&pc=${passcode}`,
        passcode: currentDepot?.magicCode ?? "",
      };
    });

    return bundles?.filter((bundle) => bundle.email);
  };

  const massSendRouteEmailsPromise = async () => {
    const emailBundles = (await getEmailBundles()) as {
      email: string;
      url: string;
      passcode: string;
    }[];

    await sendRouteEmails.mutateAsync(emailBundles);
  };

  return {
    massSendRouteEmails: massSendRouteEmailsPromise,
    isLoading: sendRouteEmails.isPending,
  };
};
