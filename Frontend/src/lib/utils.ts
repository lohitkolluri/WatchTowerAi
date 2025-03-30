import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString();
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'error':
    case 'critical':
      return 'text-destructive';
    case 'warning':
    case 'warn':
      return 'text-yellow-500';
    case 'info':
      return 'text-blue-500';
    case 'success':
    case 'debug':
      return 'text-green-500';
    default:
      return 'text-muted-foreground';
  }
}
