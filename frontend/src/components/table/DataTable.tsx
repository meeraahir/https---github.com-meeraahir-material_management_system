import clsx from "clsx";
import { useState } from "react";

import type { TableAction, TableColumn } from "../../types/ui.types";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Loader } from "../ui/Loader";
import { Button } from "../ui/Button";

interface DataTableProps<T> {
  actions?: TableAction<T>[];
  columns: TableColumn<T>[];
  data: T[];
  emptyDescription: string;
  emptyTitle: string;
  isLoading?: boolean;
  keyExtractor: (row: T, index: number) => number | string;
  page: number;
  pageSize?: number;
  searchPlaceholder?: string;
  searchValue: string;
  title?: string;
  totalCount: number;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
}

export function DataTable<T>({
  actions,
  columns,
  data,
  emptyDescription,
  emptyTitle,
  isLoading = false,
  keyExtractor,
  page,
  pageSize = 10,
  searchPlaceholder = "Search records",
  searchValue,
  title,
  totalCount,
  onPageChange,
  onSearchChange,
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<{
    columnKey: string;
    direction: "asc" | "desc";
  } | null>(null);

  const sortableColumn = columns.find((column) => column.key === sortState?.columnKey);
  const filteredRows = data.filter((row) => {
    if (!searchValue.trim()) {
      return true;
    }

    const serializedRow = columns
      .map((column) => column.accessor(row))
      .join(" ")
      .toLowerCase();

    return serializedRow.includes(searchValue.toLowerCase());
  });
  const rows = [...filteredRows];

  if (sortState && sortableColumn?.sortValue) {
    rows.sort((leftRow, rightRow) => {
      const leftValue = sortableColumn.sortValue?.(leftRow);
      const rightValue = sortableColumn.sortValue?.(rightRow);

      if (leftValue === rightValue) {
        return 0;
      }

      if (leftValue === null || leftValue === undefined) {
        return 1;
      }

      if (rightValue === null || rightValue === undefined) {
        return -1;
      }

      const compareResult =
        leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;

      return sortState.direction === "asc" ? compareResult : compareResult * -1;
    });
  }

  const effectiveCount = searchValue.trim() ? filteredRows.length : totalCount;
  const totalPages = Math.max(1, Math.ceil(effectiveCount / pageSize));

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {title ? (
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
              {title}
            </h2>
          ) : null}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {effectiveCount} records available
          </p>
        </div>
        <div className="w-full max-w-sm">
          <Input
            label="Search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-16">
          <Loader label="Loading records..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState description={emptyDescription} title={emptyTitle} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70">
                {columns.map((column) => (
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
                    key={column.key}
                  >
                    <button
                      className={clsx(
                        "inline-flex items-center gap-2",
                        column.sortValue ? "cursor-pointer" : "cursor-default",
                      )}
                      onClick={() => {
                        if (!column.sortValue) {
                          return;
                        }

                        setSortState((currentValue) => {
                          if (!currentValue || currentValue.columnKey !== column.key) {
                            return { columnKey: column.key, direction: "asc" };
                          }

                          return {
                            columnKey: column.key,
                            direction:
                              currentValue.direction === "asc" ? "desc" : "asc",
                          };
                        });
                      }}
                      type="button"
                    >
                      {column.header}
                    </button>
                  </th>
                ))}
                {actions?.length ? (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {rows.map((row, index) => (
                <tr
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  key={keyExtractor(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      className={clsx(
                        "px-4 py-4 text-sm text-slate-700 dark:text-slate-200",
                        column.className,
                      )}
                      key={column.key}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                  {actions?.length ? (
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {actions.map((action) => (
                          <Button
                            key={action.label}
                            onClick={() => action.onClick(row)}
                            size="sm"
                            type="button"
                            variant={action.variant ?? "secondary"}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Previous
          </Button>
          <Button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
