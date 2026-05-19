/**
 * Minimal structured logger. Avoids pino's runtime worker complications inside
 * Netlify Functions while keeping the same call shape we want for production
 * (info/warn/error + redact). Migrate to pino once we have real volume.
 */

const REDACTED = '[REDACTED]'
const REDACT_KEYS = new Set(['email', 'token', 'cookie', 'authorization'])

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(redact)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? REDACTED : redact(v)
  }
  return out
}

function emit(
  level: string,
  message: string,
  fields?: Record<string, unknown>,
) {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(fields ? { fields: redact(fields) } : {}),
  }
  const text = JSON.stringify(entry)
  if (level === 'error') console.error(text)
  else if (level === 'warn') console.warn(text)
  else console.log(text)
}

export const logger = {
  info: (message: string, fields?: Record<string, unknown>) =>
    emit('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) =>
    emit('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) =>
    emit('error', message, fields),
}
