/**
 * Calendar helpers that work in a configured IANA time zone.
 *
 * A "date key" is a plain YYYY-MM-DD string for a calendar day in that zone.
 * Day arithmetic is done on keys (time-zone free), and conversion to instants
 * happens only at the edges via zonedStartOfDay().
 */

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseKey(key: string): [number, number, number] {
  if (!KEY_RE.test(key)) throw new RangeError(`Invalid date key: ${key}`);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return [y, m, d];
}

function keyFromUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calendar day of an instant in the given zone. */
export function dateKey(instant: Date | string, tz: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function todayKey(tz: string, now: Date = new Date()): string {
  return dateKey(now, tz);
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = parseKey(key);
  return keyFromUtcDate(new Date(Date.UTC(y, m - 1, d + days)));
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(key: string): number {
  const [y, m, d] = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isWeekend(key: string): boolean {
  const wd = weekdayOf(key);
  return wd === 0 || wd === 6;
}

/** Monday of the week containing the key. */
export function startOfWeekKey(key: string): string {
  const wd = weekdayOf(key);
  return addDays(key, wd === 0 ? -6 : 1 - wd);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = parseKey(fromKey);
  const [y2, m2, d2] = parseKey(toKey);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Inclusive list of keys from start to end. Returns [] when end is before start. */
export function rangeKeys(startKey: string, endKey: string): string[] {
  const n = daysBetween(startKey, endKey);
  const out: string[] = [];
  for (let i = 0; i <= n; i += 1) out.push(addDays(startKey, i));
  return out;
}

/** Minutes the zone is ahead of UTC at the given instant. */
export function tzOffsetMinutes(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const instantSeconds = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - instantSeconds) / 60_000);
}

/** The instant at which the given calendar day starts in the zone. */
export function zonedStartOfDay(key: string, tz: string): Date {
  const [y, m, d] = parseKey(key);
  const guess = Date.UTC(y, m - 1, d);
  let offset = tzOffsetMinutes(new Date(guess), tz);
  let result = guess - offset * 60_000;
  // Re-check once in case the offset changed between the guess and the result (DST).
  const corrected = tzOffsetMinutes(new Date(result), tz);
  if (corrected !== offset) {
    offset = corrected;
    result = guess - offset * 60_000;
  }
  return new Date(result);
}

export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  const [y, m, d] = parseKey(key);
  return new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatTime(instant: string | Date, tz: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-IN', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}

export function formatDateTime(instant: string | Date, tz: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

export function relativeTime(instant: string | Date, now: Date = new Date()): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  const seconds = Math.round((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
