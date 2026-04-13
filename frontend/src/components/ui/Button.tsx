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
    "bg-[#111111] text-white shadow-sm hover:bg-[#1F1F1F] focus-visible:ring-[#FF6B4A]",
  secondary:
    "border border-[#E5E7EB] bg-[#F3F4F6] text-[#374151] shadow-sm hover:border-[#D1D5DB] hover:bg-[#EDEFF2] focus-visible:ring-[#FF6B4A]",
  ghost:
    "bg-transparent text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111111] focus-visible:ring-[#FF6B4A]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4.5 text-sm",
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
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60",
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
