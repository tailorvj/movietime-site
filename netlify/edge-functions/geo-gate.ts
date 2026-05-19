import type { Config, Context } from '@netlify/edge-functions'

/**
 * Soft geo-gate for landing and unavailable pages only (not verify/watch).
 * Non-Israel visitors are redirected to `/{locale}/unavailable`.
 */
export default async (
  req: Request,
  context: Context,
): Promise<Response | void> => {
  const url = new URL(req.url)

  if (
    url.searchParams.get('geo-allow') === '1' ||
    url.pathname.endsWith('/unavailable')
  ) {
    return
  }

  const country = context.geo?.country?.code ?? ''
  if (country === 'IL' || country === '') {
    return
  }

  const accept = req.headers.get('accept-language') ?? ''
  const locale = /\bru\b/i.test(accept) ? 'ru' : 'he'

  return Response.redirect(
    new URL(`/${locale}/unavailable`, url).toString(),
    302,
  )
}

export const config: Config = {
  path: '/he',
}
