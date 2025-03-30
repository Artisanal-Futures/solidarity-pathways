import type { DriverVehicleBundle } from "~/lib/validators/driver-vehicle";
import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";

type Props = { row: DriverVehicleBundle };

export const DriverDepotEditOption = ({ row }: Props) => {
  const { edit } = useDriverVehicleBundles();

  const editDriver = (id: string) => edit(id);

  return <p onClick={() => editDriver(row.vehicle.id)}>Edit</p>;
};
