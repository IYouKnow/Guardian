/** Triggers a browser download of an in-memory blob. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Triggers a client-side CSV download. Values are quoted/escaped as needed. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (value: string | number): string => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const content = [
    headers.join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');

  downloadBlob(filename, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}

/** `guardian-users-export-2026-10-20.csv` */
export function datedFilename(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
}

/** True when `iso` is within the last `days` days (null = always true). */
export function withinDays(iso: string | null | undefined, days: number | null): boolean {
  if (days === null) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return t >= Date.now() - days * 86400000;
}
