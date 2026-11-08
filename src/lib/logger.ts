/**
 * Structured JSON logger. One line per event so Vercel's log search can filter
 * on fields. Context values are only serialised when the level is enabled.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as Level;
  return ORDER[configured] ?? ORDER.info;
}

function serialiseError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: String(err) };
}

function emit(level: Level, scope: string, message: string, context?: () => Record<string, unknown>): void {
  if (ORDER[level] < threshold()) return;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message
  };
  if (context) {
    for (const [key, value] of Object.entries(context())) {
      entry[key] = key === 'err' || value instanceof Error ? serialiseError(value) : value;
    }
  }
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, context?: () => Record<string, unknown>): void;
  info(message: string, context?: () => Record<string, unknown>): void;
  warn(message: string, context?: () => Record<string, unknown>): void;
  error(message: string, context?: () => Record<string, unknown>): void;
}

/** Context is passed as a thunk so it is only built when the level is enabled. */
export function createLogger(scope: string): Logger {
  return {
    debug: (m, c) => emit('debug', scope, m, c),
    info: (m, c) => emit('info', scope, m, c),
    warn: (m, c) => emit('warn', scope, m, c),
    error: (m, c) => emit('error', scope, m, c)
  };
}
