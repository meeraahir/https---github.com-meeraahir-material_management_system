import clsx from "clsx";
import { forwardRef, useId, useRef, useState } from "react";
import type { ChangeEvent, SelectHTMLAttributes } from "react";

import { icons } from "../../assets/icons";
import { FormError } from "./FormError";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  clearable?: boolean;
  description?: string;
  error?: string;
  label: string;
  options: Array<{ label: string; value: number | string }>;
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
      <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {label}
          {requiredIndicator ? <span className="text-rose-500">*</span> : null}
        </span>
        {description ? (
          <span className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </span>
        ) : null}
        <div className="relative min-w-0">
          <select
            ref={assignRef}
            className={clsx(
              "h-12 min-w-0 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 shadow-sm outline-none transition duration-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 truncate",
              error &&
                "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60",
              className,
            )}
            id={selectId}
            {...rest}
            value={currentValue}
            onChange={(event) => {
              if (!isControlled) {
                setSelectedValue(event.target.value);
              }
              rest.onChange?.(event);
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
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            {icons.chevronRight({ className: "h-4 w-4 rotate-90" })}
          </div>
          {clearable && hasValue && !rest.disabled ? (
            <button
              className="absolute inset-y-0 right-9 my-auto inline-flex h-7 items-center rounded-full bg-slate-50 px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() => {
                if (!localRef.current) {
                  return;
                }

                if (isControlled) {
                  const event = new Event("change", { bubbles: true });
                  localRef.current.value = "";
                  rest.onChange?.(
                    event as unknown as ChangeEvent<HTMLSelectElement>,
                  );
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
