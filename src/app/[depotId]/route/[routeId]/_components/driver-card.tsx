import { useMemo } from "react";

import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { DepotCard } from "~/components/shared/depot-card";

type Props = {
  id: string;
  name: string;
};

export const DriverCard = ({ id, name }: Props) => {
  const { edit, isActive } = useDriverVehicleBundles();

  const onDriverEdit = () => edit(id);

  const isDriverActive = useMemo(() => isActive(id), [isActive, id]);

  return (
    <DepotCard
      isActive={isDriverActive}
      title={name ?? "Route Driver"}
      onEdit={onDriverEdit}
    />
  );
};
