import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-teal-700 to-cyan-700 text-white shadow-lg shadow-teal-900/18 hover:from-teal-800 hover:to-cyan-800 focus-visible:ring-teal-600",
  secondary:
    "border border-[#8fb0bd]/70 bg-[#cfe0e6] text-slate-800 shadow-sm shadow-teal-950/8 hover:border-teal-600/40 hover:bg-[#c5d8df] focus-visible:ring-teal-600 dark:border-[#8fb0bd]/70 dark:bg-[#cfe0e6] dark:text-slate-800 dark:hover:bg-[#c5d8df]",
  ghost:
    "bg-transparent text-slate-700 hover:bg-[#c5d8df] hover:text-teal-800 focus-visible:ring-teal-600 dark:text-slate-700 dark:hover:bg-[#c5d8df] dark:hover:text-teal-800",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  size = "md",
  type,
  variant = "primary",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-white",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      type={type ?? "button"}
      {...rest}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
