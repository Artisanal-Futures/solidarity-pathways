import { types } from "~/data/driver-filter-data";

import type { Table } from "@tanstack/react-table";
import { Cross2Icon } from "@radix-ui/react-icons";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DataTableFacetedFilter } from "~/components/other/data-table-faceted-filter";
import { DataTableViewOptions } from "~/components/other/data-table-view-options";

type Props<TData> = {
  table: Table<TData>;
};

export const DriverDepotDataTableToolbar = <TData,>({
  table,
}: Props<TData>) => {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex w-full items-center gap-2">
        <Input
          placeholder="Search drivers..."
          value={
            (table.getColumn("driver_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("driver_name")?.setFilterValue(event.target.value)
          }
          className="flex-1"
        />

        <DataTableViewOptions table={table} />
      </div>
      <div className="flex w-full items-center justify-between">
        {table.getColumn("driver_type") && (
          <DataTableFacetedFilter
            column={table.getColumn("driver_type")}
            title="Driver Type"
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
