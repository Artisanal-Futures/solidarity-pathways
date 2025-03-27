import { redirect } from "next/navigation";
import { useRouter } from "next/router";

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

  const createDepot = api.depots.createDepot.useMutation({
    onSuccess: ({ id, ownerId }) =>
      createDepotServer.mutate({
        depotId: id,
        ownerId: ownerId,
      }),
    onError: (error) =>
      toastService.error({
        message:
          "Something went wrong with creating the depot. Please try again.",
        error,
      }),
  });

  const createDepotServer = api.routeMessaging.createNewDepotServer.useMutation(
    {
      onSuccess: (data) => {
        const depot = data.server.inviteCode.split("-")[1];

        void router.push(
          `/tools/solidarity-pathways/${depot}/overview?welcome=true`,
        );
        toastService.success(
          "Depot and messaging server has been successfully created.",
        );
      },
      onError: (error) =>
        toastService.error({
          message:
            "Something went wrong with creating the messaging server. Please try again.",
          error,
        }),
    },
  );

  const updateDepot = api.depots.updateDepot.useMutation({
    onSuccess: () => toastService.success("Depot was successfully updated."),
    onError: (error) =>
      toastService.error({
        message:
          "Something went wrong with updating the depot. Please try again.",
        error,
      }),
    onSettled: () => {
      void apiContext.depots.invalidate();
      depotModal.onClose();
    },
  });

  const deleteDepot = api.depots.deleteDepot.useMutation({
    onSuccess: () => {
      toastService.success("Depot deleted!");
      void redirect("/tools/solidarity-pathways/");
    },
    onError: (error) =>
      toastService.error({
        error,
        message: "There seems to be an issue with deleting your depot.",
      }),
    onSettled: () => {
      void apiContext.depots.invalidate();
    },
  });

  return {
    createDepot,
    updateDepot,
    deleteDepot,
    currentDepot: getDepot.data,
  };
};
