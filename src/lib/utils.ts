import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function maskCardNumber(pan: string): string {
  if (!pan) return '•••• •••• •••• ••••';
  const last4 = pan.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

export function formatCardNumber(pan: string): string {
  if (!pan) return '';
  return pan.replace(/(.{4})/g, '$1 ').trim();
}

export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    frozen: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    inactive: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    processed: 'bg-green-500/10 text-green-500 border-green-500/20',
  };
  return statusMap[status.toLowerCase()] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
}

export function truncateAddress(address: string, chars = 8): string {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
