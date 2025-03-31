"use client";

import { types } from "~/data/driver-filter-data";

import type { Table } from "@tanstack/react-table";
import { Cross2Icon } from "@radix-ui/react-icons";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DataTableFacetedFilter } from "~/components/other/data-table-faceted-filter";
import { DataTableViewOptions } from "~/components/other/data-table-view-options";

type Props<TData> = {
  table: Table<TData>;
  accessorKey: string;
  type: "job" | "driver";
  searchPlaceholder?: string;
};

export const DataTableToolbar = <TData,>({
  table,
  accessorKey,
  type,
  searchPlaceholder,
}: Props<TData>) => {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex w-full items-center gap-2">
        <Input
          placeholder={searchPlaceholder ?? "Search..."}
          value={
            (table.getColumn(accessorKey)?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn(accessorKey)?.setFilterValue(event.target.value)
          }
          className="flex-1"
        />

        <DataTableViewOptions table={table} />
      </div>
      <div className="flex w-full items-center justify-between">
        {table.getColumn(`${type}_type`) && (
          <DataTableFacetedFilter
            column={table.getColumn(`${type}_type`)}
            title={`${type.charAt(0).toUpperCase() + type.slice(1)} Type`}
            options={types}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
