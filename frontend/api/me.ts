import { verifyToken, readCookie, COOKIE, env } from './_auth'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const token = readCookie(req, COOKIE)
  const authed = await verifyToken(token, env('AUTH_SECRET'))
  return new Response(JSON.stringify({ authed }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
