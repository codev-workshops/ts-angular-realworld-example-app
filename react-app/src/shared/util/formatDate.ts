const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** Angular `date: 'longDate'` equivalent, e.g. "August 6, 2026". */
export function longDate(value: string | number | Date): string {
  return longDateFormatter.format(new Date(value));
}

/** Angular `date: 'yyyy'` equivalent. */
export function year(value: string | number | Date): string {
  return String(new Date(value).getFullYear());
}
