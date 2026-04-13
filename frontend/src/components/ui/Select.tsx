import clsx from "clsx";
import { forwardRef, useId, useRef, useState } from "react";
import type { SelectHTMLAttributes } from "react";

import { icons } from "../../assets/icons";
import { FormError } from "./FormError";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  clearable?: boolean;
  description?: string;
  error?: string;
  label: string;
  options: Array<{ label: string; value: number | string }>;
  placeholder?: string;
  requiredIndicator?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      className,
      clearable = true,
      description,
      error,
      label,
      options,
      placeholder,
      requiredIndicator,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const localRef = useRef<HTMLSelectElement | null>(null);
    const selectId = rest.id ?? generatedId;

    function assignRef(element: HTMLSelectElement | null) {
      localRef.current = element;

      if (typeof ref === "function") {
        ref(element);
        return;
      }

      if (ref) {
        ref.current = element;
      }
    }

    const isControlled = rest.value !== undefined && rest.value !== null;
    const [selectedValue, setSelectedValue] = useState(
      isControlled ? String(rest.value) : String(rest.defaultValue ?? ""),
    );

    const currentValue = isControlled ? String(rest.value) : selectedValue;
    const hasValue = currentValue.length > 0;
    const placeholderText = String(placeholder ?? "Select an option");

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
        <div className="relative min-w-0">
          <select
            ref={assignRef}
            className={clsx(
              "h-11 min-w-0 w-full appearance-none rounded-xl border border-[#E5E7EB] bg-white px-4 pr-12 text-sm font-medium text-[#111111] shadow-sm outline-none transition duration-200 hover:border-[#D1D5DB] focus:border-[#FF6B4A] focus:ring-4 focus:ring-[#FF6B4A]/10 truncate",
              error &&
                "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10",
              className,
            )}
            id={selectId}
            {...rest}
            {...(isControlled ? { value: currentValue } : {})}
            onChange={(event) => {
              setSelectedValue(event.target.value);
              rest.onChange?.(event);
            }}
            onFocus={(event) => {
              if (!isControlled) {
                setSelectedValue(event.currentTarget.value);
              }
              rest.onFocus?.(event);
            }}
          >
            <option value="" disabled>
              {placeholderText}
            </option>
            {options.map((option) => (
              <option
                key={`${option.label}-${option.value}`}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#9CA3AF]">
            {icons.chevronRight({ className: "h-4 w-4 rotate-90" })}
          </div>
          {clearable && hasValue && !rest.disabled ? (
            <button
            className="absolute inset-y-0 right-9 my-auto inline-flex h-7 items-center rounded-full bg-[#FFF1EC] px-2 text-xs font-semibold text-[#FF6B4A] transition hover:bg-[#FFE4DB]"
              onClick={() => {
                if (!localRef.current) {
                  return;
                }

                if (isControlled) {
                  localRef.current.value = "";
                  localRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                  return;
                }

                localRef.current.value = "";
                setSelectedValue("");
                localRef.current.dispatchEvent(
                  new Event("change", { bubbles: true }),
                );
              }}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>
        <FormError message={error} />
      </label>
    );
  },
);
