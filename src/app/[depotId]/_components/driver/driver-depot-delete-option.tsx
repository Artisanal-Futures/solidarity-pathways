"use client";

import { api } from "~/trpc/react";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";

type Props = { id: string };

export const DriverDepotDeleteOption = ({ id }: Props) => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "routePlan"],
  });

  const deleteDriverMutation =
    api.driver.deleteWithVehicles.useMutation(defaultActions);

  const deleteDriver = () => {
    deleteDriverMutation.mutate(id);
  };

  return (
    <p onClick={deleteDriver} className="text-red-500 hover:text-red-400">
      Delete from Depot
    </p>
  );
};
