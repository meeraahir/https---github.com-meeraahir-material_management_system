import clsx from "clsx";
import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { FormError } from "./FormError";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  description?: string;
  error?: string;
  label: string;
  requiredIndicator?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { className, description, error, label, requiredIndicator, rows = 4, ...rest },
    ref,
  ) {
    return (
      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-700">
        <span className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-800">
          {label}
          {requiredIndicator ? <span className="text-rose-500">*</span> : null}
        </span>
        {description ? (
          <span className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-500">
            {description}
          </span>
        ) : null}
        <textarea
          ref={ref}
          className={clsx(
            "rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-blue-100 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-400",
            error &&
              "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60",
            className,
          )}
          rows={rows}
          {...rest}
        />
        <FormError message={error} />
      </label>
    );
  },
);
