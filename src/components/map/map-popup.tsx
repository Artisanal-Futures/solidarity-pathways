"use client";

import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";

import { api } from "~/trpc/react";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";

type Props = {
  name: string;
  address: string;
  id: string;
  kind: string;
};

// should really have a common interface for this and reuse
const driver = "DRIVER";
const client = "CLIENT";

export const MapPopup = ({ name, address, id, kind }: Props) => {
  const { openDriverEdit } = useDriver();
  const { openJobEdit } = useClient();
  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "job", "routePlan"],
  });

  const deleteOnlyFromRoute = api.job.delete.useMutation(defaultActions);

  const deleteVehicleMutation = api.vehicle.delete.useMutation(defaultActions);

  const handleDelete = async () => {
    console.log("trying to delete ", kind, id, name, address);

    if (kind == client) await deleteOnlyFromRoute.mutateAsync(id);

    if (kind == driver && !!id) {
      deleteVehicleMutation.mutate(id);
    }
  };

  const handleEdit = async () => {
    if (kind == driver) openDriverEdit(id);
    if (kind == client) openJobEdit(id);
  };

  return (
    <div className="flex flex-col space-y-2">
      <span className="block text-base font-bold capitalize">{name}</span>
      <span className="block">
        <span className="block font-semibold text-slate-600">Location</span>
        {address}
      </span>
      <div className="mt-auto flex items-center gap-4">
        <span
          className="block cursor-pointer text-red-600"
          onClick={handleDelete}
        >
          Delete
        </span>

        <span
          className="block cursor-pointer text-blue-600"
          onClick={handleEdit}
        >
          Edit
        </span>
      </div>
    </div>
  );
};
