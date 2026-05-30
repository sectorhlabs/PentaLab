// Utilidades de auth para las funciones edge. Los archivos con prefijo "_" no
// se exponen como rutas. Sin dependencias: solo Web Crypto (HMAC-SHA256).

const enc = new TextEncoder()

export const COOKIE = 'pl_auth'
export const MAX_AGE = 60 * 60 * 24 * 30 // 30 días

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return base64url(sig)
}

/** Comparación en tiempo (casi) constante para no filtrar info por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Token = "<expiración>.<firma>", firmado con AUTH_SECRET. */
export async function makeToken(secret: string): Promise<string> {
  const exp = Date.now() + MAX_AGE * 1000
  const sig = await hmac(String(exp), secret)
  return `${exp}.${sig}`
}

export async function verifyToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !secret) return false
  const dot = token.lastIndexOf('.')
  if (dot < 0) return false
  const exp = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
  const expected = await hmac(exp, secret)
  return safeEqual(expected, sig)
}

export function cookieHeader(token: string): string {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`
}

export function clearCookieHeader(): string {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

/** Lee una variable de entorno sin depender de @types/node (runtime edge). */
export function env(name: string): string {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  return p?.env?.[name] || ''
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return undefined
}

export { safeEqual }
