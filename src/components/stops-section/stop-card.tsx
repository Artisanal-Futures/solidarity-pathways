import { useMemo } from "react";
import { useClient } from "~/providers/client";

import { DepotCard } from "~/components/shared/depot-card";

type Props = { id: string; name: string; address: string };

export const StopCard = ({ id, name, address }: Props) => {
  const { openJobEdit, isJobActive } = useClient();

  const onJobEdit = () => openJobEdit(id);

  const isActive = useMemo(() => isJobActive(id), [isJobActive, id]);

  return (
    <DepotCard
      isActive={isActive}
      title={name ?? "New Stop"}
      subtitle={address}
      onEdit={onJobEdit}
    />
  );
};
