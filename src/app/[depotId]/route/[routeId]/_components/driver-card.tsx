import { useMemo } from "react";
import { useDriver } from "~/providers/driver";

import { useDriverVehicleBundles } from "~/hooks/drivers/use-driver-vehicle-bundles";
import { DepotCard } from "~/components/shared/depot-card";

type Props = {
  id: string;
  name: string;
};

export const DriverCard = ({ id, name }: Props) => {
  const { isDriverActive, openDriverEdit } = useDriver();

  const onDriverEdit = () => openDriverEdit(id);

  const isActive = useMemo(() => isDriverActive(id), [isDriverActive, id]);

  return (
    <DepotCard
      isActive={isActive}
      title={name ?? "Route Driver"}
      onEdit={onDriverEdit}
    />
  );
};
