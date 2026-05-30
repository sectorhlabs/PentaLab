import { clearCookieHeader } from './_auth'

export const config = { runtime: 'edge' }

export default function handler(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': clearCookieHeader() },
  })
}
