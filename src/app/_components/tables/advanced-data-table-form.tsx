"use client";

import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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

import { uniqueId } from "lodash";
import { type LucideIcon } from "lucide-react";
import {
  type ArrayPath,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";

import { DialogTrigger } from "@radix-ui/react-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FormField } from "~/components/ui/form";

export type FilterOption = {
  column: string;
  title: string;
  filters: {
    value: string;
    label: string;
    icon: LucideIcon;
  }[];
};

export type MassSelectOption = {
  label: string;
  icon?: LucideIcon;
  onClick: (data: unknown) => void;
};

interface DataTableProps<
  TData,
  TValue,
  FData extends FieldValues,
  SData extends {
    id: string;
    [key: string]: string | number | Date | string[];
  },
> {
  columns: ColumnDef<TData, TValue>[];
  handleOnMediaDelete?: (url: string) => void;
  data: TData[];
  searchKey: string;
  forceUpdate?: () => void;
  filters?: FilterOption[];
  form: UseFormReturn<FData>;
  formKey: ArrayPath<FData>;
  ignoreColumns?: string[];
  renderSelect?: SData[];
}

export function AdvancedDataTableForm<
  TData,
  TValue,
  FData extends FieldValues,
  SData extends {
    id: string;
    [key: string]: string | number | Date | string[];
  },
>({
  columns,
  handleOnMediaDelete,
  searchKey,
  filters,
  data,
  form,

  renderSelect,
}: DataTableProps<TData, TValue, FData, SData>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
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
    meta: {
      form,
      renderSelect,
      handleOnMediaDelete,
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
    autoResetAll: false,
  });

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar table={table} searchKey={searchKey} filters={filters} />
      <div className="rounded-md border bg-white">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={`${header.id}-${uniqueId()}`}>
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
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

export function EditVariationDialog<
  FData extends FieldValues,
  SData extends { id: string; [key: string]: string | number | Date },
>({
  id,
  form,

  formKey,
  renderSelect,
  currentVal,

  cellId,
}: {
  id: number;
  currentVal: string;
  // onAccept: (e: number | string) => void;
  // open: boolean;
  formKey: ArrayPath<FData>;
  form: UseFormReturn<FData>;
  renderSelect?: SData[];
  cellId: string;
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        document.body.style.pointerEvents = "";
      }, 500);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button
          onClick={() => {
            setOpen(true);
            document.body.style.pointerEvents = "none";
          }}
          variant="link"
          type="button"
        >
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Variant</DialogTitle>
          <DialogDescription>Edit variant...</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name={`${formKey}.${id}.${cellId}` as Path<FData>}
                render={({ field }) => (
                  <>
                    {renderSelect?.map((selectItem, idx) => {
                      const currentValues = currentVal?.split(`, `);

                      // const currentValues = field.value?.split(`, `);

                      return (
                        <Select
                          key={`${selectItem.id}-${uniqueId()}`}
                          defaultValue={currentValues?.[idx] ?? ""}
                          onValueChange={(value) => {
                            const newValues = (field.value as string).split(
                              ", ",
                            );
                            newValues[idx] = value;
                            field.onChange(newValues.join(", "));
                          }}
                        >
                          <SelectTrigger
                            className="w-24"
                            defaultValue={currentValues?.[idx] ?? ""}
                          >
                            <SelectValue
                              placeholder={`Select a ${
                                selectItem.name as string
                              }`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>
                                {selectItem.name as string}
                              </SelectLabel>
                              {(selectItem?.values as string)
                                ?.split(";")
                                .map((value: string) => (
                                  <SelectItem
                                    value={value}
                                    key={`${uniqueId()}-${value}`}
                                  >
                                    {value}
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      );
                    })}
                  </>
                )}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"

            // onClick={() => onAccept(inputRef.current!.value)}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
