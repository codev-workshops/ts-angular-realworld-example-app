const longDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/** Angular's `date: 'longDate'` pipe, en-US: "January 2, 2024". */
export function formatLongDate(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : longDate.format(parsed);
}
