import clsx from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { FormError } from "./FormError";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  description?: string;
  error?: string;
  hint?: string;
  label: string;
  requiredIndicator?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, description, error, hint, id, label, requiredIndicator, ...rest },
  ref,
) {
  const isNumericInput = rest.type === "number";
  const isDateInput = rest.type === "date";
  const { onKeyDown, onWheel, ...inputProps } = rest;
  const today = `${new Date().getFullYear()}-${`${new Date().getMonth() + 1}`.padStart(2, "0")}-${`${new Date().getDate()}`.padStart(2, "0")}`;
  const effectiveMax = isDateInput && !rest.max ? today : rest.max;

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
      <input
        ref={ref}
        className={clsx(
          "h-11 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#111111] shadow-sm outline-none transition duration-200 placeholder:text-[#9CA3AF] hover:border-[#D1D5DB] focus:border-[#FF6B4A] focus:ring-4 focus:ring-[#FF6B4A]/10",
          error &&
            "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10",
          className,
        )}
        id={id}
        max={effectiveMax}
        {...inputProps}
        onKeyDown={(event) => {
          if (
            isNumericInput &&
            (event.key === "ArrowUp" || event.key === "ArrowDown")
          ) {
            event.preventDefault();
          }

          onKeyDown?.(event);
        }}
        onWheel={(event) => {
          if (isNumericInput) {
            event.preventDefault();
            event.currentTarget.blur();
          }

          onWheel?.(event);
        }}
      />
      {hint ? (
        <span className="text-xs font-normal text-[#6B7280]">
          {hint}
        </span>
      ) : null}
      <FormError message={error} />
    </label>
  );
});
