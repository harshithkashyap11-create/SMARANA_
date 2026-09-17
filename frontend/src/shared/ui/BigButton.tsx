import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function BigButton({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: PropsWithChildren<BigButtonProps>) {
  const variantClasses =
    variant === "primary"
      ? "border-primary bg-primary text-primary-text"
      : "border-primary bg-surface text-text";

  return (
    <button
      className={`min-h-touch w-full rounded-card border-2 px-5 py-3 text-left font-bold ${variantClasses} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
