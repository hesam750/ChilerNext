import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname
  if (p.startsWith('/api') || p.startsWith('/login') || p.startsWith('/_next') || p.startsWith('/assets') || p === '/manifest.json' || p === '/sw.js') {
    return NextResponse.next()
  }
  const hasSession = !!req.cookies.get('session')?.value
  if (!hasSession) {
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next|assets|api).*)'] }

