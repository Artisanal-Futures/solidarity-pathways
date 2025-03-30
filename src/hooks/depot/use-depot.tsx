"use client";

import { redirect, useRouter } from "next/navigation";

import { toastService } from "@dreamwalker-studios/toasts";

import { api } from "~/trpc/react";

import { useSolidarityState } from "../optimized-data/use-solidarity-state";
import { useDepotModal } from "./use-depot-modal.wip";

export const useDepot = () => {
  const { depotId } = useSolidarityState();
  const apiContext = api.useUtils();
  const depotModal = useDepotModal();
  const router = useRouter();

  const getDepot = api.depots.getDepot.useQuery(
    { depotId },
    { enabled: !!depotId },
  );

  const createDepot = api.depots.create.useMutation({
    onSuccess: ({ data }) =>
      createDepotServer.mutate({
        depotId: data.id,
        ownerId: data.ownerId,
      }),
    onError: (error) => toastService.error({ message: error?.message, error }),
  });

  const createDepotServer = api.routeMessaging.createNewDepotServer.useMutation(
    {
      onSuccess: (data) => {
        const depot = data.server.inviteCode.split("-")[1];

        void router.push(`/${depot}/overview?welcome=true`);

        toastService.success(
          "Depot and messaging server has been successfully created.",
        );
      },
      onError: (error) =>
        toastService.error({ message: error?.message, error }),
      onSettled: () => void apiContext.routeMessaging.invalidate(),
    },
  );

  const updateDepot = api.depots.update.useMutation({
    onSuccess: ({ message }) => toastService.success(message),
    onError: (error) => toastService.error({ message: error?.message, error }),
    onSettled: () => {
      void apiContext.depots.invalidate();
      depotModal.onClose();
    },
  });

  const deleteDepot = api.depots.delete.useMutation({
    onSuccess: ({ message }) => {
      toastService.success(message);
      void redirect("/");
    },
    onError: (error) => toastService.error({ message: error?.message, error }),
    onSettled: () => void apiContext.depots.invalidate(),
  });

  return {
    createDepot,
    updateDepot,
    deleteDepot,
    currentDepot: getDepot.data,
  };
};
