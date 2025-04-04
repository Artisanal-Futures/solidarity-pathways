"use client";

import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";

import { Button } from "~/components/ui/button";

type Props = { id: string; type: "driver" | "job" };

export const DataEditOption = ({ id, type }: Props) => {
  const { openDriverEdit, closeDriverEdit } = useDriver();
  const { openJobEdit } = useClient();

  const edit = (id: string) =>
    type === "driver" ? openDriverEdit(id) : openJobEdit(id);

  return (
    <>
      <p onClick={() => edit(id)}>Edit</p>
    </>
  );
};
