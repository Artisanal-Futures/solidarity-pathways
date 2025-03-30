import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";

type Props = { row: DriverVehicleBundle };

export const DriverDepotDeleteOption = ({ row }: Props) => {
  const { deleteDriverMutation } = useDriverVehicleBundles();

  const editPost = () => {
    deleteDriverMutation.mutate({
      driverId: row.driver.id,
      vehicleId: row.vehicle.id,
    });
  };

  return (
    <p onClick={editPost} className="text-red-500 hover:text-red-400">
      Delete from Depot
    </p>
  );
};
