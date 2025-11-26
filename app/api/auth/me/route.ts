import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const c = cookies().get('session')?.value || ''
    const raw = c ? Buffer.from(c, 'base64').toString('utf8') : ''
    const payload = raw ? JSON.parse(raw) : null
    const role = (payload && payload.role) || 'guest'
    const user = (payload && payload.user) || ''
    return NextResponse.json({ ok: true, role, user })
  } catch {
    return NextResponse.json({ ok: true, role: 'guest', user: '' })
  }
}

