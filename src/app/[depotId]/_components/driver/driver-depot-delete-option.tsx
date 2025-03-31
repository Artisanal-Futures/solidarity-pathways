"use client";

import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { api } from "~/trpc/react";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";

type Props = { row: DriverVehicleBundle };

export const DriverDepotDeleteOption = ({ row }: Props) => {
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "routePlan"],
  });

  const deleteDriverMutation =
    api.driver.deleteWithVehicles.useMutation(defaultActions);

  const deleteDriver = () => {
    deleteDriverMutation.mutate(row.driver.id);
  };

  return (
    <p onClick={deleteDriver} className="text-red-500 hover:text-red-400">
      Delete from Depot
    </p>
  );
};
