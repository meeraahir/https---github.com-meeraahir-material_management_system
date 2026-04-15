const currencyNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  useGrouping: true,
});

const compactNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  useGrouping: false,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatCurrency(value: number | null | undefined): string {
  return `\u20B9${currencyNumberFormatter.format(value ?? 0)}`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  return compactNumberFormatter.format(value ?? 0);
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const parsedDate = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return dateFormatter.format(parsedDate);
}

export function truncateText(value: string | null | undefined, limit = 20): string {
  if (!value) {
    return "";
  }

  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

export function formatPaymentMode(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const normalizedValue = value.trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

  if (normalizedValue === "cash") {
    return "Cash";
  }

  if (normalizedValue === "upi") {
    return "UPI";
  }

  if (normalizedValue === "bank" || normalizedValue === "bank_transfer") {
    return "Bank Transfer";
  }

  if (normalizedValue === "check") {
    return "Check";
  }

  if (normalizedValue === "other") {
    return "Other";
  }

  return normalizedValue
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getPaymentModeLabel(source: {
  payment_mode?: string | null;
  paymentMode?: string | null;
} | null | undefined): string {
  return formatPaymentMode(source?.payment_mode ?? source?.paymentMode);
}
