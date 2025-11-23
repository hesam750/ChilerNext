import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getAllowedHosts() {
  const raw = process.env.ALLOWED_PROXY_HOSTS || ''
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

function isAllowedHost(host: string | null | undefined) {
  const allowed = getAllowedHosts()
  if (allowed.length === 0) return true
  const h = String(host || '').toLowerCase()
  return allowed.some(a => a === h)
}

export async function OPTIONS() {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return new NextResponse(null, { status: 204, headers })
}

async function fetchWrap(url: string, opts: any) {
  let attempts = 0
  async function once() {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const o = { ...(opts || {}), signal: ctrl ? ctrl.signal : undefined }
    let tm: any = null
    try {
      tm = setTimeout(function () { try { ctrl && ctrl.abort() } catch {} }, 12000)
      return await fetch(url, o)
    } finally { if (tm) try { clearTimeout(tm) } catch {} }
  }
  try { return await once() } catch (e) { attempts++; if (attempts >= 2) throw e; await new Promise(r => setTimeout(r, 200)); return once() }
}

async function handle(req: NextRequest) {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')

  const urlParam = req.nextUrl.searchParams.get('url')
  if (!urlParam) return new NextResponse('Missing query parameter: url', { status: 400, headers })
  let target: URL
  try { target = new URL(urlParam) } catch { return new NextResponse('Invalid URL', { status: 400, headers }) }
  if (!/^https?:$/.test(target.protocol)) return new NextResponse('Only http/https is supported', { status: 400, headers })
  if (!isAllowedHost(target.host)) return new NextResponse('Target host not allowed', { status: 403, headers })

  let body: any = undefined
  if (req.method === 'POST') body = await req.text()

  try {
    const upstream = await fetchWrap(target.href, {
      method: req.method,
      headers: { 'Content-Type': req.headers.get('content-type') || (req.method === 'POST' ? 'application/x-www-form-urlencoded' : undefined) },
      body: req.method === 'POST' ? body : undefined,
    })
    const ct = upstream.headers.get('content-type') || 'text/plain; charset=utf-8'
    const buf = Buffer.from(await upstream.arrayBuffer())
    const resp = new NextResponse(buf, { status: upstream.status, headers })
    resp.headers.set('Content-Type', ct)
    return resp
  } catch (e: any) {
    return new NextResponse('Upstream error: ' + (e && e.message ? e.message : String(e)), { status: 502, headers })
  }
}

export async function GET(req: NextRequest) { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }