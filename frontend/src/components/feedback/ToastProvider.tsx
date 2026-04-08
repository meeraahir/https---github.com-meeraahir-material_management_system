import clsx from "clsx";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { ToastContext } from "./toastContext";
import type { ToastContextValue } from "./toastContext";

type ToastVariant = "error" | "success";

interface ToastItem {
  id: number;
  message: string;
  title: string;
  variant: ToastVariant;
}

const toastStyles: Record<ToastVariant, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-100",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-100",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((currentValue) => currentValue.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, title: string, message: string) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;

      setToasts((currentValue) => [
        ...currentValue,
        {
          id,
          message,
          title,
          variant,
        },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      showError: (title, message) => {
        showToast("error", title, message);
      },
      showSuccess: (title, message) => {
        showToast("success", title, message);
      },
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-3 px-4 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            className={clsx(
              "pointer-events-auto w-full rounded-3xl border px-4 py-4 shadow-xl backdrop-blur-sm transition",
              toastStyles[toast.variant],
            )}
            key={toast.id}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="text-sm leading-6 opacity-90">{toast.message}</p>
              </div>
              <button
                className="rounded-full p-1 text-current/70 transition hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
                onClick={() => removeToast(toast.id)}
                type="button"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
