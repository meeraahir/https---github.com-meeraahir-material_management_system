import clsx from "clsx";
import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: "lg" | "md" | "xl";
  title: string;
}

const sizeClasses = {
  lg: "max-w-2xl",
  md: "max-w-xl",
  xl: "max-w-4xl",
};

export function Modal({
  children,
  footer,
  onClose,
  open,
  size = "lg",
  title,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/35 p-3 backdrop-blur-sm sm:p-4">
      <div
        className={clsx(
          "mx-auto flex min-h-[calc(100vh-1.5rem)] w-full items-center justify-center sm:min-h-[calc(100vh-2rem)]",
        )}
      >
        <div
          className={clsx(
            "my-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl shadow-blue-950/15 dark:border-blue-100 dark:bg-white",
            sizeClasses[size],
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-blue-100 bg-blue-50/45 px-5 py-4 sm:px-6 dark:border-blue-100 dark:bg-blue-50/45">
            <h2 className="text-lg font-black text-slate-950 sm:text-xl dark:text-slate-950">
              {title}
            </h2>
            <button
              className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-blue-700 dark:hover:bg-white dark:hover:text-blue-700"
              onClick={onClose}
              type="button"
            >
              x
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-blue-100 bg-slate-50/60 px-5 py-4 sm:px-6 dark:border-blue-100 dark:bg-slate-50/60">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
