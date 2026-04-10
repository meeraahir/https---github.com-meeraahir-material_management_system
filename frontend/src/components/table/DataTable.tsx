import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react";

import type { TableAction, TableColumn } from "../../types/ui.types";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Loader } from "../ui/Loader";

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

interface ColumnMeta {
  header: string;
  key: string;
}

function isMoneyColumn(column: ColumnMeta) {
  return /(amount|balance|cost|paid|pending|payment|receivable|wage|total)/i.test(
    `${column.key} ${column.header}`,
  );
}

function isNumericColumn(column: ColumnMeta, value: ReactNode) {
  return typeof value === "number" || isMoneyColumn(column);
}

function getStatusTone(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (["paid", "received", "yes", "present", "available"].includes(normalizedValue)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-200 dark:bg-emerald-50 dark:text-emerald-700";
  }

  if (["partial", "low", "in progress"].includes(normalizedValue)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-200 dark:bg-amber-50 dark:text-amber-700";
  }

  if (["pending", "no", "absent", "used"].includes(normalizedValue)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-200 dark:bg-rose-50 dark:text-rose-700";
  }

  return "";
}

function shouldRenderStatusBadge(column: ColumnMeta, value: ReactNode) {
  if (typeof value !== "string") {
    return false;
  }

  return Boolean(
    getStatusTone(value) &&
      /(status|present|attendance|received)/i.test(`${column.key} ${column.header}`),
  );
}

function formatCellValue(column: ColumnMeta, value: ReactNode): ReactNode {
  if (typeof value === "string" && shouldRenderStatusBadge(column, value)) {
    return (
      <span
        className={clsx(
          "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
          getStatusTone(value),
        )}
      >
        {value}
      </span>
    );
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDate(value);
  }

  if (typeof value === "number") {
    return isMoneyColumn(column) ? formatCurrency(value) : formatNumber(value);
  }

  return value;
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

function getActionVariantClass(label: string) {
  if (/delete|remove/i.test(label)) {
    return "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-200 dark:text-rose-700 dark:hover:bg-rose-50";
  }

  if (/view/i.test(label)) {
    return "table-action-view !border-teal-700 !bg-teal-700 !text-white shadow-teal-900/15 hover:!border-teal-800 hover:!bg-teal-800 dark:!border-teal-700 dark:!bg-teal-700 dark:!text-white dark:hover:!bg-teal-800";
  }

  return "";
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
  searchValue,
  totalCount,
  onPageChange,
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<{
    columnKey: string;
    direction: "asc" | "desc";
  } | null>(null);

  const sortableColumn = columns.find(
    (column) => column.key === sortState?.columnKey,
  );
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
    <section className="erp-shell-panel overflow-hidden rounded-3xl border bg-white/94 shadow-lg dark:bg-white/94">
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
          <div className="grid gap-3 p-4 md:hidden">
            {paginatedRows.map((row, index) => (
              <article
                className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-950/5 dark:border-blue-100 dark:bg-white"
                key={keyExtractor(row, index)}
              >
                <dl className="grid gap-3">
                  {columns.map((column) => {
                    const cellValue = column.accessor(row);
                    const formattedValue = formatCellValue(
                      column,
                      cellValue,
                    );

                    return (
                      <div
                        className="flex items-start justify-between gap-4 border-b border-blue-50 pb-2 last:border-b-0 last:pb-0 dark:border-blue-50"
                        key={column.key}
                      >
                        <dt className="max-w-[45%] text-[0.8rem] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-600">
                          {column.header}
                        </dt>
                        <dd
                          className={clsx(
                            "min-w-0 flex-1 text-right text-sm font-semibold text-slate-900 dark:text-slate-900",
                            isNumericColumn(column, cellValue) &&
                              "tabular-nums",
                          )}
                          title={getCellTooltip(cellValue)}
                        >
                          <span className="inline-block max-w-full overflow-hidden text-ellipsis align-bottom">
                            {formattedValue}
                          </span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                {actions?.length ? (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {actions.map((action) => (
                      <Button
                        className={getActionVariantClass(action.label)}
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
                ) : null}
              </article>
            ))}
          </div>

          <div className="hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white/95 to-transparent dark:from-white/95" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white/95 to-transparent dark:from-white/95" />
          <div className="table-scrollbar overflow-x-auto pb-2">
            <table className="min-w-full table-auto divide-y divide-blue-100 dark:divide-blue-100">
              <thead>
                <tr className="erp-table-head bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 dark:from-blue-50 dark:via-sky-50 dark:to-cyan-50">
                  {columns.map((column) => (
                    <th
                      className={clsx(
                        "min-w-36 max-w-[13rem] whitespace-nowrap px-4 py-3.5 text-[0.86rem] font-black uppercase tracking-[0.12em] text-slate-800 dark:text-slate-800",
                        /(amount|balance|cost|paid|pending|payment|receivable|wage|total|quantity|stock|used|received)/i.test(`${column.key} ${column.header}`)
                          ? "text-right"
                          : "text-left",
                      )}
                      key={column.key}
                    >
                      <button
                        className={clsx(
                          "inline-flex max-w-full items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap leading-5",
                          column.sortValue
                            ? "cursor-pointer"
                            : "cursor-default",
                        )}
                        onClick={() => {
                          if (!column.sortValue) {
                            return;
                          }

                          setSortState((currentValue) => {
                            if (
                              !currentValue ||
                              currentValue.columnKey !== column.key
                            ) {
                              return {
                                columnKey: column.key,
                                direction: "asc",
                              };
                            }

                            return {
                              columnKey: column.key,
                              direction:
                                currentValue.direction === "asc"
                                  ? "desc"
                                  : "asc",
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
                    <th className="sticky right-0 z-20 w-44 whitespace-nowrap bg-[#a8c7cf]/95 px-4 py-3.5 text-right text-[0.86rem] font-black uppercase tracking-[0.12em] text-slate-800 shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.35)] dark:bg-[#a8c7cf]/95 dark:text-slate-800">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50 dark:divide-blue-50">
                {paginatedRows.map((row, index) => (
                  <tr
                    className="transition hover:bg-blue-50/70 dark:hover:bg-blue-50/70"
                    key={keyExtractor(row, index)}
                  >
                    {columns.map((column) => {
                      const cellValue = column.accessor(row);
                      const formattedValue = formatCellValue(
                        column,
                        cellValue,
                      );

                      return (
                        <td
                          className={clsx(
                            "min-w-36 max-w-[13rem] px-4 py-3 text-[0.95rem] font-semibold text-slate-800 dark:text-slate-800",
                            isNumericColumn(column, cellValue) &&
                              "text-right tabular-nums",
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
                      <td className="sticky right-0 z-10 w-44 whitespace-nowrap bg-white/96 px-4 py-3 shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.35)] dark:bg-white/96">
                        <div className="flex flex-nowrap justify-end gap-2">
                          {actions.map((action) => (
                            <Button
                              className={getActionVariantClass(action.label)}
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
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-blue-100 bg-blue-50/35 px-5 py-3 text-sm font-medium text-slate-600 dark:border-blue-100 dark:bg-blue-50/35 dark:text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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
