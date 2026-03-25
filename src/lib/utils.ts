import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null) {
  if (!date) return '—';
  return format(parseISO(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | null) {
  if (!date) return '—';
  return format(parseISO(date), 'MMM d, yyyy h:mm a');
}

export function formatRelativeDate(date: string) {
  return formatDistanceToNow(parseISO(date), { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getOverdueDays(dueDate: string): number {
  return differenceInDays(new Date(), parseISO(dueDate));
}
