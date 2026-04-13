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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#111111]/30 p-3 backdrop-blur-sm sm:p-4">
      <div
        className={clsx(
          "mx-auto flex min-h-[calc(100vh-1.5rem)] w-full items-center justify-center sm:min-h-[calc(100vh-2rem)]",
        )}
      >
        <div
          className={clsx(
            "my-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.12)]",
            sizeClasses[size],
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-[#111111] sm:text-xl">
              {title}
            </h2>
            <button
              className="rounded-full p-2 text-[#6B7280] transition hover:bg-white hover:text-[#111111]"
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
            <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
