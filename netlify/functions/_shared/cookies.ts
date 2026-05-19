import { createHmac, timingSafeEqual } from 'node:crypto'
import * as cookie from 'cookie'
import { env } from './env'

export const SESSION_COOKIE = 'mt-access'

export type SessionPayload = {
  tokenId: string
  emailHash: string
  locale: 'he' | 'ru'
  expiresAt: number
}

function hmac(payload: string): string {
  return createHmac('sha256', env.cookieSecret())
    .update(payload)
    .digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Build a `mt-access=<payload>.<hmac>` cookie value. */
export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = hmac(body)
  return `${body}.${signature}`
}

/** Parse + verify the cookie value. Returns null if missing/invalid/expired. */
export function readSession(value: string | undefined): SessionPayload | null {
  if (!value) return null
  const [body, signature] = value.split('.')
  if (!body || !signature) return null
  if (!safeEqual(signature, hmac(body))) return null
  let parsed: SessionPayload
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
  if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt < Date.now()) {
    return null
  }
  return parsed
}

/** Serialize a Set-Cookie header for a freshly issued session. */
export function setSessionCookie(payload: SessionPayload): string {
  const ttlSeconds = Math.max(
    1,
    Math.floor((payload.expiresAt - Date.now()) / 1000),
  )
  return cookie.serialize(SESSION_COOKIE, signSession(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: ttlSeconds,
  })
}

/** Serialize a Set-Cookie header that clears the session. */
export function clearSessionCookie(): string {
  return cookie.serialize(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: 0,
  })
}

/** Read the session payload from a `Cookie:` header. */
export function readSessionFromHeader(
  cookieHeader: string | null | undefined,
): SessionPayload | null {
  if (!cookieHeader) return null
  const parsed = cookie.parse(cookieHeader)
  return readSession(parsed[SESSION_COOKIE])
}
