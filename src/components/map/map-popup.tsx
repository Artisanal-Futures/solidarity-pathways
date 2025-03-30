import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { useDeleteJob } from "~/hooks/jobs/CRUD/use-delete-job";

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
  const { deleteJobFromRoute } = useDeleteJob();
  const { deleteVehicleMutation } = useDriverVehicleBundles(); // Use the hook to get the deletion function

  const handleDelete = () => {
    console.log("trying to delete ", kind, id, name, address);

    if (kind == client) {
      deleteJobFromRoute({ id });
    }

    if (kind == driver && !!id) {
      deleteVehicleMutation.mutate(id);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <span className="block text-base font-bold capitalize">{name}</span>
      <span className="block">
        <span className="block font-semibold text-slate-600">Location</span>
        {address}
      </span>
      <span
        className="mt-auto block cursor-pointer text-red-600"
        onClick={handleDelete}
      >
        Delete
      </span>
    </div>
  );
};
