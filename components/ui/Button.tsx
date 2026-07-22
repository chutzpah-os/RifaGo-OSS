import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "accent" | "outline" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-paper-raised hover:bg-primary-strong disabled:bg-ink-soft",
  accent:
    "bg-accent text-paper-raised hover:bg-accent-strong disabled:bg-ink-soft",
  outline:
    "border border-line text-ink hover:border-primary hover:text-primary disabled:opacity-50",
  danger:
    "border border-danger text-danger hover:bg-danger hover:text-paper-raised disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
