import clsx from "clsx";

interface ErrorMessageProps {
  className?: string;
  message?: string | null;
}

export function ErrorMessage({ className, message }: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={clsx(
        "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-950/70 dark:bg-rose-950/30 dark:text-rose-200",
        className,
      )}
      role="alert"
    >
      {message}
    </div>
  );
}
