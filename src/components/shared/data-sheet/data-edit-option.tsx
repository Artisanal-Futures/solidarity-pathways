"use client";

import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";

type Props = { id: string; type: "driver" | "job" };

export const DataEditOption = ({ id, type }: Props) => {
  const { openDriverEdit } = useDriver();
  const { openJobEdit } = useClient();

  const edit = (id: string) =>
    type === "driver" ? openDriverEdit(id) : openJobEdit(id);

  return <p onClick={() => edit(id)}>Edit</p>;
};
