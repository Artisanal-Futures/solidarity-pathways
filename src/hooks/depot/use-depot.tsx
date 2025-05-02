"use client";

import { redirect, useRouter } from "next/navigation";

import { api } from "~/trpc/react";

import { useSolidarityState } from "../optimized-data/use-solidarity-state";
import { useDefaultMutationActions } from "../use-default-mutation-actions";
import { useDepotModal } from "./use-depot-modal.wip";

export const useDepot = () => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["depot"],
  });
  const { depotId } = useSolidarityState();

  const depotModal = useDepotModal();
  const router = useRouter();

  const getDepot = api.depot.get.useQuery(depotId, { enabled: !!depotId });

  const createDepot = api.depot.create.useMutation({
    ...defaultActions,
    onSuccess: ({ data, message }) => {
      defaultActions.onSuccess({ message });
      void router.push(`/${data.id}/overview?welcome=true`);
    },
  });

  const updateDepot = api.depot.update.useMutation({
    ...defaultActions,
    onSettled: () => {
      defaultActions.onSettled();
      depotModal.onClose();
    },
  });

  const deleteDepot = api.depot.delete.useMutation({
    ...defaultActions,
    onSuccess: ({ message }) => {
      defaultActions.onSuccess({ message });
      void redirect("/");
    },
  });

  return {
    createDepot,
    updateDepot,
    deleteDepot,
    currentDepot: getDepot.data,
  };
};
