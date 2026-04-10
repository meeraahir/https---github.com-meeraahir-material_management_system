import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react";

import type { TableAction, TableColumn } from "../../types/ui.types";
import { formatDate, formatNumber } from "../../utils/format";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Loader } from "../ui/Loader";
import { Button } from "../ui/Button";

interface DataTableProps<T> {
  actions?: TableAction<T>[];
  clientPagination?: boolean;
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

function formatCellValue(value: ReactNode): ReactNode {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDate(value);
  }

  return typeof value === "number" ? formatNumber(value) : value;
}

function serializeCellValue(value: ReactNode): string {
  if (typeof value === "number") {
    return `${value} ${formatNumber(value)}`;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value} ${formatDate(value)}`;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function getCellTooltip(value: ReactNode): string | undefined {
  if (typeof value === "number") {
    return formatNumber(value);
  }

  if (typeof value === "string") {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return undefined;
}

export function DataTable<T>({
  actions,
  clientPagination = false,
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
      .map((column) => serializeCellValue(column.accessor(row)))
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
  const paginatedRows = clientPagination
    ? rows.slice((page - 1) * pageSize, page * pageSize)
    : rows;

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
            {formatNumber(effectiveCount)} records available
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
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white/95 to-transparent dark:from-slate-950/90" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white/95 to-transparent dark:from-slate-950/90" />
          <div className="table-scrollbar overflow-x-auto pb-2">
          <table className="w-full table-fixed divide-y divide-slate-200 dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70">
                {columns.map((column) => (
                  <th
                    className="w-44 max-w-[11rem] whitespace-nowrap overflow-hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
                    key={column.key}
                  >
                    <button
                      className={clsx(
                        "inline-flex max-w-full items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap",
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
                  <th className="sticky right-0 z-20 w-56 max-w-[14rem] whitespace-nowrap bg-slate-50/95 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.9)] dark:bg-slate-900/95 dark:text-slate-400">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {paginatedRows.map((row, index) => (
                <tr
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  key={keyExtractor(row, index)}
                >
                  {columns.map((column) => {
                    const cellValue = column.accessor(row);
                    const formattedValue = formatCellValue(cellValue);

                    return (
                      <td
                        className={clsx(
                          "w-44 max-w-[11rem] px-4 py-4 text-sm text-slate-700 dark:text-slate-200",
                          column.className,
                        )}
                        key={column.key}
                      >
                        <div
                          className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                          title={getCellTooltip(cellValue)}
                        >
                          {formattedValue}
                        </div>
                      </td>
                    );
                  })}
                  {actions?.length ? (
                    <td className="sticky right-0 z-10 w-56 max-w-[14rem] whitespace-nowrap bg-white/95 px-4 py-4 shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.9)] dark:bg-slate-950/95">
                      <div className="flex flex-nowrap justify-end gap-2">
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
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {formatNumber(page)} of {formatNumber(totalPages)}
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
