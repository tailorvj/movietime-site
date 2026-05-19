import type { Config, Context } from '@netlify/functions'
import { tokensStore } from './_shared/blobs'
import { readSessionFromHeader, setSessionCookie } from './_shared/cookies'
import { env } from './_shared/env'
import { logger } from './_shared/logger'
import { json } from './_shared/responses'
import { tokenIdSchema, tokenRecordSchema } from './_shared/schemas'

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'GET') {
    return json(405, { error: 'method_not_allowed' })
  }

  const url = new URL(req.url)
  const tokenId = url.pathname.split('/').pop() ?? ''
  const idCheck = tokenIdSchema.safeParse(tokenId)
  if (!idCheck.success) {
    return json(400, { error: 'invalid_token' })
  }

  const tokens = tokensStore()
  let raw: Awaited<ReturnType<typeof tokens.getWithMetadata>> = null
  try {
    raw = await tokens.getWithMetadata(tokenId, { type: 'json' })
  } catch (err) {
    logger.error('blobs read failed', { err: String(err) })
    return json(500, { error: 'internal_error' })
  }
  if (!raw) {
    return json(404, { error: 'token_not_found' })
  }

  const recordCheck = tokenRecordSchema.safeParse(raw.data)
  if (!recordCheck.success) {
    logger.warn('token payload invalid', { tokenId })
    return json(404, { error: 'token_not_found' })
  }
  const record = recordCheck.data

  if (record.used) {
    // Idempotent re-open: same browser already verified (e.g. React Strict Mode
    // double-fetch, refresh, or back button) should not show "link already used".
    const session = readSessionFromHeader(req.headers.get('cookie'))
    if (
      session &&
      session.tokenId === tokenId &&
      session.emailHash === record.emailHash
    ) {
      const ttlSeconds = Math.max(
        1,
        Math.floor((session.expiresAt - Date.now()) / 1000),
      )
      return json(200, {
        ok: true,
        locale: record.locale,
        ttl: ttlSeconds,
      })
    }
    return json(409, { error: 'token_already_used' })
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return json(410, { error: 'token_expired' })
  }

  const usedAt = new Date().toISOString()
  try {
    const writeOptions = raw.etag
      ? {
          onlyIfMatch: raw.etag,
          metadata: {
            expiresAt: new Date(record.expiresAt).getTime(),
            used: true,
          },
        }
      : {
          metadata: {
            expiresAt: new Date(record.expiresAt).getTime(),
            used: true,
          },
        }
    const result = await tokens.setJSON(
      tokenId,
      { ...record, used: true, usedAt },
      writeOptions,
    )
    if (!result.modified) {
      return json(409, { error: 'token_already_used' })
    }
  } catch (err) {
    logger.error('blobs conditional write failed', { err: String(err) })
    return json(500, { error: 'internal_error' })
  }

  const ttlMs = env.sessionTtlSeconds() * 1000
  const cookieHeader = setSessionCookie({
    tokenId,
    emailHash: record.emailHash,
    locale: record.locale,
    expiresAt: Date.now() + ttlMs,
  })

  logger.info('access token consumed', { tokenId, locale: record.locale })

  return json(
    200,
    { ok: true, locale: record.locale, ttl: env.sessionTtlSeconds() },
    { 'set-cookie': cookieHeader },
  )
}

export const config: Config = {
  path: '/api/verify-token/:token',
}
