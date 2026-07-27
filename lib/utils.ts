import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Whole-dollar formatting for totals and pipeline values. */
export const currency = (n: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Cents-precision formatting for unit prices ($/sq ft, per-unit materials). */
export const price = (n: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

export const number = (n: number): string => new Intl.NumberFormat("en-US").format(n);

export const percent = (fraction: number): string =>
  new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(fraction);
