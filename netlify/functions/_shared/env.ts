/**
 * Centralized env access. Functions read configuration through this module so
 * the production-vs-dev guards live in one place.
 */

const isProduction = process.env.CONTEXT === 'production'

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.length === 0) {
    if (isProduction) {
      throw new Error(`Missing required environment variable: ${name}`)
    }
    return ''
  }
  return value
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

/** Non-negative integer from env; invalid values fall back to `fallback`. */
function nonNegativeInt(name: string, fallback: number): number {
  const raw = optional(name, String(fallback))
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

const DEV_APP_URL = 'http://localhost:8888'

export const env = {
  isProduction,
  appUrl: () =>
    (optional('APP_URL', DEV_APP_URL) || DEV_APP_URL).replace(/\/$/, ''),
  cookieSecret: () => required('COOKIE_SECRET') || 'local-dev-secret',
  emailHashSalt: () => required('EMAIL_HASH_SALT') || 'local-dev-salt',
  sessionTtlSeconds: () => {
    const raw = optional('SESSION_TTL_SECONDS', '60')
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60
  },
  resendApiKey: () => optional('RESEND_API_KEY'),
  emailFrom: () =>
    optional('EMAIL_FROM', 'Gett Movie Time <onboarding@resend.dev>'),
  requestAccessIpLimitPerDay: () =>
    nonNegativeInt('REQUEST_ACCESS_IP_LIMIT_PER_DAY', 5),
  requestAccessEmailLimitPerHour: () =>
    nonNegativeInt('REQUEST_ACCESS_EMAIL_LIMIT_PER_HOUR', 3),
}
