import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "small" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-strong dark:text-[#0f2119]",
  secondary:
    "border border-line bg-surface text-ink shadow-sm hover:bg-surface-raised",
  ghost: "text-muted hover:bg-surface-raised hover:text-ink",
  danger: "bg-danger text-white hover:brightness-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-4 text-sm",
  small: "h-9 px-3 text-sm",
  icon: "size-11",
};

export function buttonVariants({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
