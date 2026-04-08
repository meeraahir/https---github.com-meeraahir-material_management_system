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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className={clsx(
          "w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950",
          sizeClasses[size],
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
            {title}
          </h2>
          <button
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <div className="py-5">{children}</div>
        {footer ? (
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
