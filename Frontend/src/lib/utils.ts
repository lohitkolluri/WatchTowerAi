import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'critical':
    case 'error':
    case 'failed':
      return 'destructive';
    case 'warning':
      return 'orange';
    case 'success':
    case 'healthy':
    case 'ok':
      return 'green';
    default:
      return 'muted';
  }
}
