import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getRole(username: string, password: string): 'admin' | 'user' | null {
  const ADMIN_USER = process.env.ADMIN_USER || 'admin'
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'
  const USER_USER = process.env.USER_USER || 'user'
  const USER_PASS = process.env.USER_PASS || 'user123'
  if (username === ADMIN_USER && password === ADMIN_PASS) return 'admin'
  if (username === USER_USER && password === USER_PASS) return 'user'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const username = String(data.username || '')
    const password = String(data.password || '')
    const role = getRole(username, password)
    if (!role) return NextResponse.json({ ok: false, error: 'نام کاربری یا رمز عبور نادرست است' }, { status: 401 })
    const payload = { role, user: username, at: Date.now() }
    const token = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
    const res = NextResponse.json({ ok: true, role })
    res.cookies.set('session', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'درخواست نامعتبر' }, { status: 400 })
  }
}

