import type { Config, Context } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { mailQueueStore, tokensStore } from './_shared/blobs'
import { env } from './_shared/env'
import { emailHash, ipHash } from './_shared/hash'
import { logger } from './_shared/logger'
import { bump } from './_shared/rate-limit'
import { clientIp, json } from './_shared/responses'
import {
  MAIL_BACKGROUND_FETCH_MS,
  mailBackgroundUrl,
} from './_shared/mail-background'
import { requestAccessSchema } from './_shared/schemas'

const ACCESS_TOKEN_TTL_HOURS = 24

type MailPayload = {
  tokenId: string
  email: string
  accessUrl: string
  locale: 'he' | 'ru'
}

async function enqueueMail(
  payload: MailPayload,
  context: Context,
): Promise<void> {
  const url = mailBackgroundUrl()
  const task = fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(MAIL_BACKGROUND_FETCH_MS),
  })
    .then(async (res) => {
      if (!res.ok && res.status !== 202) {
        const text = await res.text()
        logger.error('background mail invoke failed', {
          status: res.status,
          text,
          tokenId: payload.tokenId,
          url,
        })
      }
    })
    .catch((err) => {
      logger.error('background mail invoke failed', {
        err: String(err),
        tokenId: payload.tokenId,
        url,
      })
    })

  if (typeof context.waitUntil === 'function') {
    context.waitUntil(task)
  } else {
    void task
  }
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const parsed = requestAccessSchema.safeParse(body)
  if (!parsed.success) {
    return json(400, { error: 'invalid_input' })
  }
  const { email, locale } = parsed.data

  const ip = clientIp(req)
  const ipKey = ipHash(ip)
  const emailKey = emailHash(email)
  const day = new Date().toISOString().slice(0, 10)
  const hour = new Date().toISOString().slice(0, 13)

  const ipLimit = env.requestAccessIpLimitPerDay()
  const emailLimit = env.requestAccessEmailLimitPerHour()

  const [ipBudget, emailBudget] = await Promise.all([
    ipLimit > 0
      ? bump(`ip:${ipKey}:${day}`, ipLimit, 60 * 60 * 24)
      : Promise.resolve({ ok: true, count: 0 }),
    emailLimit > 0
      ? bump(`em:${emailKey}:${hour}`, emailLimit, 60 * 60)
      : Promise.resolve({ ok: true, count: 0 }),
  ])
  if (!ipBudget.ok) {
    logger.warn('rate-limited by ip', { ipKey, count: ipBudget.count })
    return json(429, { error: 'rate_limited' })
  }
  if (!emailBudget.ok) {
    logger.warn('rate-limited by email', { emailKey, count: emailBudget.count })
    return json(429, { error: 'rate_limited' })
  }

  const tokenId = randomUUID()
  const now = Date.now()
  const expiresAt = now + ACCESS_TOKEN_TTL_HOURS * 60 * 60 * 1000

  const tokens = tokensStore()
  try {
    await tokens.setJSON(
      tokenId,
      {
        emailHash: emailKey,
        used: false,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        ipHash: ipKey,
        locale,
      },
      { metadata: { expiresAt, used: false } },
    )
  } catch (err) {
    logger.error('failed to persist access token', { err: String(err) })
    return json(500, { error: 'internal_error' })
  }

  const accessUrl = `${env.appUrl()}/${locale}/verify/${tokenId}`

  try {
    await mailQueueStore().setJSON(`mail:${tokenId}`, {
      status: 'pending',
      emailHash: emailKey,
      locale,
      createdAt: new Date(now).toISOString(),
    })
  } catch (err) {
    logger.error('failed to persist mail queue row', { err: String(err) })
    return json(500, { error: 'internal_error' })
  }

  logger.info('access_requested', { emailKey, ipKey, locale, tokenId })

  void enqueueMail({ tokenId, email, accessUrl, locale }, context)

  return json(202, { ok: true, status: 'queued' })
}

export const config: Config = {
  path: '/api/request-access',
}
