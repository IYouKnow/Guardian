import { format, formatDistanceToNowStrict } from 'date-fns';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Parses a human-readable size like "1.23 GB" back into bytes. */
export function parseBytes(value: string | null | undefined): number {
  const match = /^([\d.]+)\s*(B|KB|MB|GB|TB)$/i.exec((value ?? '').trim());
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return 0;
  const unitIndex = BYTE_UNITS.indexOf(match[2].toUpperCase() as (typeof BYTE_UNITS)[number]);
  return unitIndex < 0 ? 0 : amount * 1024 ** unitIndex;
}

/** Formats bytes to match the server's output, extended with a TB step. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const decimals = unitIndex === 0 ? 0 : unitIndex <= 2 ? 1 : 2;
  return `${(bytes / 1024 ** unitIndex).toFixed(decimals)} ${BYTE_UNITS[unitIndex]}`;
}

/** Renders a seconds count as `1d 4h 32m`. */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Renders an ISO timestamp as `2 min ago`, empty when unparseable. */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return `${formatDistanceToNowStrict(date)} ago`;
}

/**
 * Renders a `YYYY-MM-DD` bucket as a short weekday (`Mon`). Parsed from its
 * parts rather than `new Date(day)` so a UTC-midnight string can't shift to the
 * previous day in a negative-offset timezone.
 */
export function formatDayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return day;
  return format(new Date(year, month - 1, date), 'EEE');
}
