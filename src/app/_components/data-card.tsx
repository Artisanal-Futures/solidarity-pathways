"use client";

import { useMemo } from "react";
import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";

import { DepotCard } from "~/components/shared/depot-card";

type Props = {
  id: string;
  name: string;
  type: "job" | "vehicle";
  subtitle?: string;
};

export const DataCard = ({ id, name, subtitle, type }: Props) => {
  const { isDriverActive, openDriverEdit } = useDriver();
  const { isJobActive, openJobEdit } = useClient();

  const edit = useMemo(
    () => (type === "job" ? () => openJobEdit(id) : () => openDriverEdit(id)),
    [openJobEdit, openDriverEdit, type, id],
  );

  const isActive = useMemo(
    () => (type === "job" ? isJobActive(id) : isDriverActive(id)),
    [type, isJobActive, isDriverActive, id],
  );

  return (
    <DepotCard
      isActive={isActive}
      title={name ?? "New Stop"}
      subtitle={subtitle ?? undefined}
      onEdit={edit}
    />
  );
};
