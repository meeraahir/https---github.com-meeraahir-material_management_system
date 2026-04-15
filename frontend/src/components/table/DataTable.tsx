import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react";

import { icons } from "../../assets/icons";
import type { TableAction, TableColumn } from "../../types/ui.types";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Loader } from "../ui/Loader";

interface DataTableProps<T> {
  actions?: TableAction<T>[];
  actionsDisplay?: "icon" | "text";
  bodyViewportClassName?: string;
  compact?: boolean;
  clientPagination?: boolean;
  columns: TableColumn<T>[];
  data: T[];
  emptyDescription: string;
  emptyTitle: string;
  headerActions?: ReactNode;
  headerDescription?: string;
  headerTitle?: string;
  hidePagination?: boolean;
  isLoading?: boolean;
  keyExtractor: (row: T, index: number) => number | string;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
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

function isNumericLikeColumn(column: ColumnMeta) {
  return /(amount|balance|cost|paid|pending|payment|receivable|wage|total|quantity|stock|used|received|rate|value|days|count)/i.test(
    `${column.key} ${column.header}`,
  );
}

function parseNumericString(value: string) {
  const trimmedValue = value.trim();

  if (!/^-?\d+(?:\.\d+)?$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function isNumericColumn(column: ColumnMeta, value: ReactNode) {
  return typeof value === "number" || (typeof value === "string" && parseNumericString(value) !== null && isNumericLikeColumn(column)) || isMoneyColumn(column);
}

function getStatusTone(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (["paid", "received", "yes", "present", "available"].includes(normalizedValue)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["active", "partial", "low", "in progress"].includes(normalizedValue)) {
    return "border-[#FFD8CD] bg-[#FFF1EC] text-[#C2410C]";
  }

  if (["inactive", "pending", "no", "absent", "used"].includes(normalizedValue)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "";
}

function shouldRenderStatusBadge(column: ColumnMeta, value: ReactNode) {
  if (typeof value !== "string") {
    return false;
  }

  return Boolean(
    getStatusTone(value) &&
      /(status|present|attendance|received|active|inactive)/i.test(`${column.key} ${column.header}`),
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

  if (typeof value === "string") {
    const parsedValue = parseNumericString(value);

    if (parsedValue !== null && isNumericLikeColumn(column)) {
      return isMoneyColumn(column)
        ? formatCurrency(parsedValue)
        : formatNumber(parsedValue);
    }
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return formatDate(value);
    }

    const parsedValue = parseNumericString(value);
    return parsedValue !== null ? formatNumber(parsedValue) : value;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return undefined;
}

function getActionVariantClass(label: string) {
  if (/delete|remove/i.test(label)) {
    return "border-rose-200 text-rose-700 hover:bg-rose-50";
  }

  if (/view/i.test(label)) {
    return "table-action-view !border-[#111111] !bg-[#111111] !text-white hover:!border-[#1F1F1F] hover:!bg-[#1F1F1F]";
  }

  return "";
}

export function DataTable<T>({
  actions,
  actionsDisplay = "text",
  bodyViewportClassName,
  compact = false,
  clientPagination = false,
  columns,
  data,
  emptyDescription,
  emptyTitle,
  headerActions,
  headerDescription,
  headerTitle,
  hidePagination = false,
  isLoading = false,
  keyExtractor,
  onRowClick,
  onRowDoubleClick,
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
  const showHeader = Boolean(headerTitle || headerDescription || headerActions);
  const isRowInteractive = Boolean(onRowClick || onRowDoubleClick);
  const headerCellClassName = compact
    ? "px-3 py-2.5 text-[0.76rem]"
    : "px-4 py-3 text-[0.82rem]";
  const bodyCellClassName = compact
    ? "px-3 py-2.5 text-[0.88rem]"
    : "px-4 py-3 text-[0.95rem]";

  return (
    <section className="erp-shell-panel overflow-hidden rounded-3xl border bg-white">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
          <div className="min-w-0">
            {headerTitle ? (
              <div>
                <h3 className="text-base font-semibold text-[#111111]">
                  {headerTitle}
                </h3>
                {headerDescription ? (
                  <p className="mt-1 text-sm font-medium text-[#6B7280]">
                    {headerDescription}
                  </p>
                ) : null}
              </div>
            ) : headerDescription ? (
              <p className="text-sm font-medium text-[#6B7280]">{headerDescription}</p>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
      ) : null}
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
                className={clsx(
                  "rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition duration-200",
                  isRowInteractive && "cursor-pointer hover:border-[#D1D5DB] hover:shadow-md",
                )}
                key={keyExtractor(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
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
                        className="flex items-start justify-between gap-4 border-b border-[#F3F4F6] pb-2 last:border-b-0 last:pb-0"
                        key={column.key}
                      >
                        <dt className="max-w-[45%] text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                          {column.header}
                        </dt>
                        <dd
                          className={clsx(
                            "min-w-0 flex-1 text-right text-sm font-medium text-[#111111]",
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
                    {actions.map((action) => {
                      const resolvedDisplay = action.display ?? actionsDisplay;

                      return resolvedDisplay === "icon" ? (
                        <button
                          aria-label={action.ariaLabel ?? action.label}
                          className={clsx(
                            "inline-flex items-center justify-center border border-[#E5E7EB] bg-[#F3F4F6] text-[#374151] shadow-sm transition hover:border-[#D1D5DB] hover:bg-[#EDEFF2] disabled:cursor-not-allowed disabled:opacity-60",
                            compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl",
                            getActionVariantClass(action.label),
                          )}
                          disabled={action.disabled?.(row) ?? false}
                          key={action.ariaLabel ?? action.label}
                          onClick={(event) => {
                            event.stopPropagation();
                            action.onClick(row);
                          }}
                          title={action.ariaLabel ?? action.label}
                          type="button"
                        >
                          {action.icon ?? icons.chevronRight({ className: "h-4 w-4" })}
                        </button>
                      ) : (
                        <Button
                          className={getActionVariantClass(action.label)}
                          disabled={action.disabled?.(row) ?? false}
                          key={action.label}
                          onClick={(event) => {
                            event.stopPropagation();
                            action.onClick(row);
                          }}
                          size="sm"
                          type="button"
                          variant={action.variant ?? "secondary"}
                        >
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent" />
          <div
            className={clsx(
              "table-scrollbar overflow-x-auto pb-2",
              bodyViewportClassName && "overflow-y-auto",
              bodyViewportClassName,
            )}
          >
            <table className="min-w-full table-fixed divide-y divide-[#E5E7EB]">
              <thead className={clsx(bodyViewportClassName && "sticky top-0 z-20")}>
                <tr className="erp-table-head bg-[#F9FAFB]">
                  {columns.map((column) => (
                    (() => {
                      return (
                    <th
                      className={clsx(
                        "whitespace-nowrap font-semibold uppercase tracking-[0.12em] text-[#6B7280]",
                        headerCellClassName,
                        column.className,
                        "text-left",
                      )}
                      key={column.key}
                    >
                      <button
                        className={clsx(
                          "inline-flex w-full items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap leading-5",
                          "justify-start text-left",
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
                      );
                    })()
                  ))}
                  {actions?.length ? (
                    <th className={clsx(
                        "sticky right-0 z-20 whitespace-nowrap bg-[#F9FAFB] text-left font-semibold uppercase tracking-[0.12em] text-[#6B7280] shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.15)]",
                      compact ? "px-3 py-2.5 text-[0.76rem]" : "px-4 py-3.5 text-[0.86rem]",
                      actionsDisplay === "icon" ? (compact ? "w-24" : "w-28") : "w-44",
                    )}>
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {paginatedRows.map((row, index) => (
                  <tr
                    className={clsx(
                      "transition duration-200 hover:bg-[#FAFAFA]",
                      isRowInteractive && "cursor-pointer",
                    )}
                    key={keyExtractor(row, index)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row) : undefined}
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
                            "font-medium text-[#111111] align-top",
                            bodyCellClassName,
                            "text-left",
                            isNumericColumn(column, cellValue) && "tabular-nums",
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
                      <td className={clsx(
                        "sticky right-0 z-10 whitespace-nowrap bg-white shadow-[-10px_0_20px_-20px_rgba(15,23,42,0.15)]",
                        compact ? "px-3 py-2.5" : "px-4 py-3",
                        actionsDisplay === "icon" ? (compact ? "w-24" : "w-28") : "w-44",
                      )}>
                        <div className="flex flex-nowrap justify-start gap-2">
                          {actions.map((action) => {
                            const resolvedDisplay = action.display ?? actionsDisplay;

                            return resolvedDisplay === "icon" ? (
                              <button
                                aria-label={action.ariaLabel ?? action.label}
                                className={clsx(
                                  "inline-flex items-center justify-center border border-[#E5E7EB] bg-[#F3F4F6] text-[#374151] shadow-sm transition hover:border-[#D1D5DB] hover:bg-[#EDEFF2] disabled:cursor-not-allowed disabled:opacity-60",
                                  compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl",
                                  getActionVariantClass(action.label),
                                )}
                                disabled={action.disabled?.(row) ?? false}
                                key={action.ariaLabel ?? action.label}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  action.onClick(row);
                                }}
                                title={action.ariaLabel ?? action.label}
                                type="button"
                              >
                                {action.icon ?? icons.chevronRight({ className: "h-4 w-4" })}
                              </button>
                            ) : (
                              <Button
                                className={getActionVariantClass(action.label)}
                                disabled={action.disabled?.(row) ?? false}
                                key={action.label}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  action.onClick(row);
                                }}
                                size="sm"
                                type="button"
                                variant={action.variant ?? "secondary"}
                              >
                                {action.label}
                              </Button>
                            );
                          })}
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

      {!hidePagination ? (
        <div className="flex flex-col gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4 text-sm font-medium text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
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
      ) : null}
    </section>
  );
}
