import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";

import type { DriverVehicleBundle } from "~/types.wip";

type Props = { row: DriverVehicleBundle };
export const DriverDepotEditOption = ({ row }: Props) => {
  const { edit } = useDriverVehicleBundles();

  const editDriver = (id: string) => edit(id);

  return <p onClick={() => editDriver(row.vehicle.id)}>Edit</p>;
};
