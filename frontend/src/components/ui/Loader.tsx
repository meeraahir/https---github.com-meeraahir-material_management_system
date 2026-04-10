import clsx from "clsx";

interface LoaderProps {
  className?: string;
  fullscreen?: boolean;
  label?: string;
}

export function Loader({
  className,
  fullscreen = false,
  label = "Loading...",
}: LoaderProps) {
  const content = (
    <div
      className={clsx(
        "flex items-center justify-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-600",
        className,
      )}
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      <span>{label}</span>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-50/50 dark:bg-blue-50/50">
        {content}
      </div>
    );
  }

  return content;
}
