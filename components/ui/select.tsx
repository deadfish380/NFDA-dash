import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

/** Native select styled to match Input — same height, border, and focus ring. */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-input bg-card px-3 text-sm",
        "transition-[box-shadow,border-color] duration-150 ease-out",
        "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
