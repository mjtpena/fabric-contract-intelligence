const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const relativeUnits = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
] as const;

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '—';
  }

  return dateTimeFormatter.format(date);
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '—';
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const match = relativeUnits.find(({ seconds }) => absoluteSeconds >= seconds) ?? relativeUnits.at(-1)!;

  return relativeFormatter.format(Math.round(diffSeconds / match.seconds), match.unit);
}
