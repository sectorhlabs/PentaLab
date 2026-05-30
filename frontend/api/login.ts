import { makeToken, cookieHeader, safeEqual, env } from './_auth'

export const config = { runtime: 'edge' }

function json(obj: unknown, status: number, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...(extra || {}) },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const passcode = env('SITE_PASSCODE')
  const secret = env('AUTH_SECRET')
  if (!passcode || !secret) return json({ error: 'server_not_configured' }, 500)

  let input = ''
  try {
    const body = (await req.json()) as { passcode?: unknown }
    if (typeof body?.passcode === 'string') input = body.passcode
  } catch {
    /* body inválido → clave vacía → 401 */
  }

  if (!safeEqual(input, passcode)) return json({ ok: false }, 401)

  const token = await makeToken(secret)
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader(token) })
}
