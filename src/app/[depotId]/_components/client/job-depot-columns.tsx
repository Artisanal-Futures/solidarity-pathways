/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { ArrowUpDown } from "lucide-react";

import type { ColumnDef } from "@tanstack/react-table";

import type { ClientJobBundle } from "~/lib/validators/client-job";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { DataTableRowOptions } from "~/components/shared/data-sheet/data-table-row-options";

type DataColumn = {
  id: string;
  name: string;
  type?: string;
  address: string;
  bundle: Partial<ClientJobBundle>;
};

export const jobDepotColumns: ColumnDef<DataColumn>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.original?.name ?? "Unsaved Client"}</div>
    ),
  },
  {
    accessorKey: "type",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="capitalize">{row.original.type}</div>,
  },
  {
    accessorKey: "address",

    filterFn: (row, id, value) => {
      const address = row.getValue(id);

      return (address as string)
        .toLowerCase()
        .includes(value.toLowerCase() as string);
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Address
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.original?.address}</div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const jobBundle = row.original;

      return <DataTableRowOptions id={jobBundle?.id} type="job" />;
    },
  },
];
