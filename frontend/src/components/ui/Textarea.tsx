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
      <label className="flex w-full flex-col gap-2 text-sm font-medium text-[#374151]">
        <span className="flex items-center gap-1 text-sm font-semibold text-[#111111]">
          {label}
          {requiredIndicator ? <span className="text-rose-500">*</span> : null}
        </span>
        {description ? (
          <span className="text-xs font-normal leading-5 text-[#6B7280]">
            {description}
          </span>
        ) : null}
        <textarea
          ref={ref}
          className={clsx(
            "rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#111111] shadow-sm outline-none transition duration-200 placeholder:text-[#9CA3AF] hover:border-[#D1D5DB] focus:border-[#FF6B4A] focus:ring-4 focus:ring-[#FF6B4A]/10",
            error &&
              "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10",
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
