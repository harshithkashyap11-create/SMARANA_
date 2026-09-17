import type { HTMLAttributes, PropsWithChildren } from "react";

export function Card({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <section
      className={`rounded-card border border-primary/20 bg-surface p-5 shadow-card ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
