import clsx from "clsx";
import type { ReactNode } from "react";

import type { DetailField } from "../../types/ui.types";
import { formatDate, formatNumber } from "../../utils/format";
import { Button } from "../ui/Button";
import { Modal } from "../modal/Modal";

interface EntityDetailsModalProps<TEntity> {
  fields: DetailField<TEntity>[];
  item: TEntity | null;
  onClose: () => void;
  title: string;
}

function formatDetailValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return formatNumber(value);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDate(value);
  }

  return value;
}

export function EntityDetailsModal<TEntity>({
  fields,
  item,
  onClose,
  title,
}: EntityDetailsModalProps<TEntity>) {
  return (
    <Modal
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
        </div>
      }
      onClose={onClose}
      open={Boolean(item)}
      size="xl"
      title={title}
    >
      {item ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/60 p-3 dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
              Record Details
            </p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Complete backend response details for this record. Empty optional values are shown as "-".
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
              <div
                className={clsx(
                  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80",
                  field.highlight &&
                    "border-blue-200 bg-blue-50/70 dark:border-blue-900/70 dark:bg-blue-950/30",
                  field.span === "full" && "sm:col-span-2 xl:col-span-3",
                )}
                key={field.label}
              >
                <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {field.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">
                  {formatDetailValue(field.value(item))}
                </dd>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
