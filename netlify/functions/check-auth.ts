import type { Config, Context } from '@netlify/functions'
import { readSessionFromHeader } from './_shared/cookies'
import { json } from './_shared/responses'

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'GET') {
    return json(405, { error: 'method_not_allowed' })
  }

  const session = readSessionFromHeader(req.headers.get('cookie'))
  if (!session) {
    return json(200, { authenticated: false })
  }

  return json(200, {
    authenticated: true,
    locale: session.locale,
    expiresAt: session.expiresAt,
  })
}

export const config: Config = {
  path: '/api/check-auth',
}
