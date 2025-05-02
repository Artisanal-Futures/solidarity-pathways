"use client";

import { useClient } from "~/providers/client";
import { useDriver } from "~/providers/driver";
import { Loader2, MoreHorizontal } from "lucide-react";

import { api } from "~/trpc/react";
import { useDefaultMutationActions } from "~/hooks/use-default-mutation-actions";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type Props = { id: string; type: "driver" | "job" };

export const DataTableRowOptions = ({ id, type }: Props) => {
  // const { openDriverEdit } = useDriver();
  // const { openJobEdit } = useClient();

  const { defaultActions } = useDefaultMutationActions({
    invalidateEntities: ["driver", "routePlan"],
  });

  const deleteDriverMutation =
    api.driver.deleteWithVehicles.useMutation(defaultActions);

  const deleteDriver = () => {
    deleteDriverMutation.mutate(id);
  };

  // const editItem = () =>
  //   type === "driver" ? openDriverEdit(id) : openJobEdit(id);

  const deleteItem = () => {
    if (type === "driver") {
      deleteDriver();
    } else {
      console.log("not implemented");
    }
  };

  const isLoading = deleteDriverMutation.isPending;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {/* <DropdownMenuItem>
          <p onClick={editItem}>Edit</p>
        </DropdownMenuItem> */}
        <DropdownMenuItem>
          <p onClick={deleteItem} className="text-red-500 hover:text-red-400">
            Delete from Depot
          </p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
