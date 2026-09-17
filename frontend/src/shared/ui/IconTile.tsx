import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconTileProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  icon: ReactNode;
  label: string;
}

export function IconTile({
  className = "",
  icon,
  label,
  type = "button",
  ...props
}: IconTileProps) {
  return (
    <button
      className={`min-h-touch flex w-full items-center gap-4 rounded-card border-2 border-primary bg-surface px-5 py-3 text-left font-bold text-text ${className}`}
      type={type}
      {...props}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[2rem] text-primary">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
