import clsx from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { FormError } from "./FormError";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, hint, id, label, ...rest },
  ref,
) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <input
        ref={ref}
        className={clsx(
          "h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
          error &&
            "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60",
          className,
        )}
        id={id}
        {...rest}
      />
      {hint ? (
        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
      <FormError message={error} />
    </label>
  );
});
