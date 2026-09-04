import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes safely (deduplication + conflict resolution).
 * Used by motion-primitives components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
