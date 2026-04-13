import type { TableColumn } from "../types/ui.types";
import { formatDate, formatNumber } from "./format";

const numericReportKeyPattern =
  /(amount|balance|cost|credit|debit|paid|pending|quantity|received|stock|total|used|wage|count|days)/i;

function prettifyKey(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDynamicReportValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    return value;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return formatDate(value);
  }

  if (
    typeof value === "string" &&
    numericReportKeyPattern.test(key) &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return formatNumber(Number(value));
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function buildDynamicReportColumns(
  rows: Record<string, unknown>[],
): TableColumn<Record<string, unknown>>[] {
  const firstRow = rows[0];

  if (!firstRow) {
    return [];
  }

  return Object.keys(firstRow).map((key) => ({
    key,
    header: prettifyKey(key),
    accessor: (row) => formatDynamicReportValue(key, row[key]),
    sortValue: (row) => {
      const value = row[key];
      return typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
        ? value
        : JSON.stringify(value ?? "");
    },
  }));
}
