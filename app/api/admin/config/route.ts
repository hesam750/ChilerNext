import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

function isAdmin(): boolean {
  try {
    const c = cookies().get('session')?.value || ''
    const raw = c ? Buffer.from(c, 'base64').toString('utf8') : ''
    const payload = raw ? JSON.parse(raw) : null
    return !!(payload && payload.role === 'admin')
  } catch { return false }
}

async function readCfg() {
  const p = path.join(process.cwd(), 'public', 'assets', 'data', 'dashboard.config.json')
  const raw = await fs.readFile(p, 'utf-8')
  const json = JSON.parse(raw)
  return { p, json }
}

async function writeCfg(p: string, json: any) {
  const text = JSON.stringify(json, null, 2)
  await fs.writeFile(p, text, 'utf-8')
}

export async function GET() {
  try {
    if (!isAdmin()) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
    const { json } = await readCfg()
    return NextResponse.json({ ok: true, config: json })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: (e && e.message) || 'Failed to read config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin()) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
    const { p, json } = await readCfg()
    const body = await req.json()
    const action = String(body.action || '')
    if (action === 'add') {
      const name = String(body.name || '').trim()
      const ip = String(body.ip || '').trim()
      if (!name) return NextResponse.json({ ok: false, error: 'نام الزامی است' }, { status: 400 })
      const unit = { name, vars: {} }
      json.units = Array.isArray(json.units) ? json.units : []
      json.units.push(unit)
      if (ip) json.deviceUrl = /^https?:\/\//.test(ip) ? ip : ('http://' + ip + '/getvar.csv')
      await writeCfg(p, json)
      return NextResponse.json({ ok: true, config: json })
    }
    if (action === 'update') {
      const index = Number(body.index)
      const name = String(body.name || '')
      const ip = String(body.ip || '')
      if (isNaN(index) || index < 0 || index >= (json.units || []).length) return NextResponse.json({ ok: false, error: 'شناسه نامعتبر' }, { status: 400 })
      if (name) json.units[index].name = name
      if (ip) json.deviceUrl = /^https?:\/\//.test(ip) ? ip : ('http://' + ip + '/getvar.csv')
      await writeCfg(p, json)
      return NextResponse.json({ ok: true, config: json })
    }
    if (action === 'delete') {
      const index = Number(body.index)
      if (isNaN(index) || index < 0 || index >= (json.units || []).length) return NextResponse.json({ ok: false, error: 'شناسه نامعتبر' }, { status: 400 })
      json.units.splice(index, 1)
      await writeCfg(p, json)
      return NextResponse.json({ ok: true, config: json })
    }
    if (action === 'setDeviceIp') {
      const ip = String(body.ip || '').trim()
      if (!ip) return NextResponse.json({ ok: false, error: 'IP الزامی است' }, { status: 400 })
      json.deviceUrl = /^https?:\/\//.test(ip) ? ip : ('http://' + ip + '/getvar.csv')
      await writeCfg(p, json)
      return NextResponse.json({ ok: true, config: json })
    }
    return NextResponse.json({ ok: false, error: 'اقدام نامعتبر' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: (e && e.message) || 'Failed to update config' }, { status: 500 })
  }
}

