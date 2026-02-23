"use client";
import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "yes" | "no" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300",
  secondary:
    "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-400",
  yes: "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-emerald-200",
  no: "bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-200",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-200",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-13 px-6 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "font-semibold transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 select-none cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
