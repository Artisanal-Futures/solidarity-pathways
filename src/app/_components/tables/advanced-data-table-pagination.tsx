import type { Table } from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useEffect } from "react";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const pageParam = url.searchParams.get("page");
    const rowsPerPageParam = url.searchParams.get("rows");

    if (rowsPerPageParam) {
      const rowsPerPage = parseInt(rowsPerPageParam, 10);
      if (!isNaN(rowsPerPage) && rowsPerPage > 0) {
        table.setPageSize(rowsPerPage);
      }
    }

    if (pageParam) {
      const pageIndex = parseInt(pageParam, 10) - 1;
      if (
        !isNaN(pageIndex) &&
        pageIndex >= 0 &&
        pageIndex < table.getPageCount()
      ) {
        table.setPageIndex(pageIndex);
      }
    }
  }, [table]);

  const updatePageInUrl = (pageIndex: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", `${pageIndex + 1}`);
    window.history.replaceState({}, "", url.toString());
  };

  const updateRowsPerPageInUrl = (rowsPerPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("rows", `${rowsPerPage}`);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              const rowsPerPage = Number(value);
              table.setPageSize(rowsPerPage);
              updateRowsPerPageInUrl(rowsPerPage);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => {
              table.setPageIndex(0);
              updatePageInUrl(0);
            }}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              table.previousPage();
              updatePageInUrl(table.getState().pagination.pageIndex - 1);
            }}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              table.nextPage();
              updatePageInUrl(table.getState().pagination.pageIndex + 1);
            }}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => {
              const lastPage = table.getPageCount() - 1;
              table.setPageIndex(lastPage);
              updatePageInUrl(lastPage);
            }}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
