/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/non-nullable-type-assertion-style */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";

import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { DataTablePagination } from "./advanced-data-table-pagination";
import { DataTableToolbar } from "./advanced-data-table-toolbar";

export type FilterOption = {
  column: string;
  title: string;
  filters: {
    value: string;
    label: string;
    icon?: LucideIcon;
  }[];
};

export type MassSelectOption = {
  label: string;
  icon?: LucideIcon;
  onClick: (data: unknown) => void;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey: string;
  filters?: FilterOption[];
  handleMassDelete?: (data: TData[]) => void;
  handleAdd?: () => void;
  addButtonLabel?: string;
  addButton?: React.ReactNode;
  moreOptions?: React.ReactNode;
  searchPlaceholder?: string;
  defaultColumnVisibility?: VisibilityState;
  showViewOptions?: boolean;
  preSelectedDataIds?: string[];
  preSelectAccessor?: string;
  postSelectAccessor?: string;
  setSelectedData?: (
    data: {
      id: string;
      [key: string]: unknown;
    }[],
  ) => void;
}

export function AdvancedDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  filters,
  handleMassDelete,
  handleAdd,
  addButtonLabel = "Add",
  addButton,
  moreOptions,
  searchPlaceholder,
  defaultColumnVisibility,
  showViewOptions = false,
  preSelectedDataIds,
  preSelectAccessor,
  postSelectAccessor,
  setSelectedData,
}: DataTableProps<TData, TValue>) {
  const handleSelectedRows = () => {
    if (!preSelectedDataIds) return {};

    // Create a record of row indices that should be selected
    const selectedRowIndices: Record<number, boolean> = {};

    // Only proceed if both preSelectedDataIds and preSelectAccessor are defined
    if (preSelectedDataIds && preSelectAccessor) {
      // Find matching rows and mark their indices for selection
      data?.forEach((row, index) => {
        const rowId = (row as Record<string, unknown>)[preSelectAccessor];
        if (Array.isArray(preSelectedDataIds)) {
          // Convert rowId to string for comparison to handle both string and number types
          const stringRowId = String(rowId);
          if (preSelectedDataIds.some((id) => String(id) === stringRowId)) {
            selectedRowIndices[index] = true;
          }
        }
      });
    }

    console.log(`selectedRowIndices: ${JSON.stringify(selectedRowIndices)}`);

    return selectedRowIndices ?? {};
  };

  const [rowSelection, setRowSelection] = React.useState(handleSelectedRows());
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility ?? {});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: {
      rowSelection: handleSelectedRows(),
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const handleToolbarChange = React.useMemo(() => {
    return table.getSelectedRowModel().rows.length > 0 && !!handleMassDelete;
  }, [table, handleMassDelete]);

  // Update selected data whenever row selection changes
  useEffect(() => {
    if (!setSelectedData || !postSelectAccessor) return;

    // Get the selected rows directly from rowSelection object
    const selectedRowIds = Object.keys(rowSelection).filter(
      (key) => rowSelection[key as unknown as number],
    );

    // Map through data instead of using table.getSelectedRowModel()
    const selectedBundles = data
      .filter((_, index) => selectedRowIds.includes(index.toString()))
      .map((item) => {
        const originalData = item as Record<string, unknown>;
        const id = preSelectAccessor
          ? String(originalData[preSelectAccessor])
          : "";
        const bundle = originalData[postSelectAccessor] as Record<
          string,
          unknown
        >;

        return {
          id,
          ...bundle,
        };
      });

    setSelectedData(selectedBundles);
  }, [rowSelection]);

  return (
    <div className="w-full space-y-4 transition-all duration-300 ease-in-out">
      <div className={cn("w-full", handleToolbarChange && "hidden")}>
        <DataTableToolbar
          table={table}
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          handleAdd={handleAdd}
          addButtonLabel={addButtonLabel}
          addButton={addButton}
          moreOptions={moreOptions}
          showViewOptions={showViewOptions}
        />
      </div>

      <div className={cn("hidden space-x-2", handleToolbarChange && "flex")}>
        <Button size="sm" className="max-h-[32px]">
          Duplicate
        </Button>

        {handleMassDelete && (
          <Button size="sm" className="max-h-[32px]">
            Delete
          </Button>
        )}

        <Button size="sm" className="max-h-[32px]">
          Export
        </Button>
      </div>
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
