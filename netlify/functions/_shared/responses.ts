type JsonBody = Record<string, unknown> | { error: string }

export function json(
  status: number,
  body: JsonBody,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  })
}

/**
 * Read the client IP from the request headers Netlify exposes. Falls back to
 * an empty string in local dev where the header may be absent.
 */
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    ''
  )
}
