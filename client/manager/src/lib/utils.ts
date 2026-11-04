import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...xs: ClassValue[]): string {
  return twMerge(clsx(xs));
}
