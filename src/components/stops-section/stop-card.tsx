import { useMemo } from "react";

import { useClientJobBundles } from "~/hooks/jobs/use-client-job-bundles";
import { DepotCard } from "~/components/shared/depot-card";

type Props = { id: string; name: string; address: string };

export const StopCard = ({ id, name, address }: Props) => {
  const { edit, isActive } = useClientJobBundles();

  const onJobEdit = () => edit(id);

  const isJobActive = useMemo(() => isActive(id), [isActive, id]);

  return (
    <DepotCard
      isActive={isJobActive}
      title={name ?? "New Stop"}
      subtitle={address}
      onEdit={onJobEdit}
    />
  );
};
