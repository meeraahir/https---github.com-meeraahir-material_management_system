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
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
              <div
                className={clsx(
                  "rounded-xl border border-blue-100 bg-white px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-blue-100 dark:bg-white dark:hover:border-blue-200",
                  field.highlight &&
                    "border-blue-200 bg-blue-50/80 dark:border-blue-200 dark:bg-blue-50/80",
                  field.span === "full" && "sm:col-span-2 xl:col-span-3",
                )}
                key={field.label}
              >
                <dt className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                  {field.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900 dark:text-slate-900">
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
