import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CurrencyCode } from '../types/index.ts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  GHS: 'GHS',
  NGN: '₦',
  KES: 'KSh',
  USD: '$',
  GBP: '£',
};

export function formatMoney(amount: number, currency: CurrencyCode = 'GHS'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formattedNumber}`;
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function calculateDaysRemaining(targetDateIso: string): number {
  const now = new Date().getTime();
  const target = new Date(targetDateIso).getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function isDateMatured(targetDateIso: string): boolean {
  return new Date().getTime() >= new Date(targetDateIso).getTime();
}

export function generateRef(): string {
  return 'SV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}
