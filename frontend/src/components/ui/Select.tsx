import clsx from "clsx";
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { FormError } from "./FormError";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label: string;
  options: Array<{ label: string; value: number | string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, label, options, ...rest },
  ref,
) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <select
        ref={ref}
        className={clsx(
          "h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          error &&
            "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60",
          className,
        )}
        {...rest}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={`${option.label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FormError message={error} />
    </label>
  );
});
