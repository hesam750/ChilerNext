import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

type VarsRow = { name: string; value: string }

const cache: { map: Record<string, string>; text: string; at: number; url: string } = { map: {}, text: '', at: 0, url: '' }
const TTL = 1500

function parseVarsTable(html: string): VarsRow[] {
  try {
    const rows: { name: string; value: string }[] = []
    const t = String(html || '')
    const tableMatch = t.match(/<table[^>]*id=["']?varsTable["']?[^>]*>[\s\S]*?<\/table>/i) || t.match(/<table[^>]*>[\s\S]*?<\/table>/i)
    if (!tableMatch) return rows
    const tbodyMatch = tableMatch[0].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
    const body = tbodyMatch ? tbodyMatch[1] : tableMatch[0]
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/ig
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/ig
    let tr: RegExpExecArray | null
    while ((tr = trRe.exec(body))) {
      const tds: string[] = []
      let m: RegExpExecArray | null
      tdRe.lastIndex = 0
      while ((m = tdRe.exec(tr[1]))) {
        const txt = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
        if (txt !== '') tds.push(txt)
      }
      if (tds.length) {
        const name = (tds[1] || tds[0] || '').trim()
        const value = (tds[3] || tds[2] || tds[1] || '').trim()
        if (name) rows.push({ name, value })
      }
    }
    return rows
  } catch { return [] }
}

function parseVarsCsv(text: string): VarsRow[] {
  try {
    const out: { name: string; value: string }[] = []
    const t = String(text || '')
    if (!t.trim()) return out
    const tt = t.trim()
    if (tt[0] === '<' || /<table/i.test(tt)) return out
    const firstLine = t.split(/\r?\n/)[0] || ''
    let cntComma = 0, cntSemi = 0
    for (let i = 0; i < firstLine.length; i++) { const c = firstLine[i]; if (c === ',') cntComma++; else if (c === ';') cntSemi++ }
    const delimiter = cntSemi > cntComma ? ';' : ','
    const lines = t.trim().split(/\r?\n/)
    if (lines.length <= 1) return out
    const header = lines[0].split(delimiter)
    const idx: Record<string, number> = {}
    header.forEach(function (h, i) { idx[String(h || '').trim().toLowerCase()] = i })
    function unq(s: any) { return String(s == null ? '' : s).replace(/^(".*")$/, '$1').replace(/^"(.*)"$/, '$1') }
    function splitSmart(line: string, delim: string) {
      const res: string[] = []
      let cur = ''
      let inQ = false
      const L = line.length
      for (let j = 0; j < L; j++) {
        const ch = line[j]
        if (ch === '"') { if (inQ && j + 1 < L && line[j + 1] === '"') { cur += '"'; j++ } else { inQ = !inQ } }
        else if (ch === delim && !inQ) { res.push(cur); cur = '' }
        else { cur += ch }
      }
      res.push(cur)
      return res
    }
    for (let i = 1; i < lines.length; i++) {
      const cols = splitSmart(lines[i], delimiter)
      const name = unq(cols[idx['name']])
      if (name) {
        const val = unq(cols[idx['val']] || cols[idx['value']])
        out.push({ name, value: val })
      }
    }
    return out
  } catch { return [] }
}

function parseResponse(text: string): VarsRow[] {
  const t = String(text || '')
  const tt = t.trim()
  if (!tt) return []
  if (tt[0] === '<' || /<table/i.test(tt)) {
    const rows = parseVarsTable(t)
    if (rows && rows.length) return rows
  }
  const csv = parseVarsCsv(t)
  if (csv && csv.length) return csv
  return parseVarsTable(t)
}

async function readConfigDeviceUrl(): Promise<string> {
  try {
    const p = path.join(process.cwd(), 'public', 'assets', 'data', 'dashboard.config.json')
    const raw = await fs.readFile(p, 'utf-8')
    const cfg = JSON.parse(raw)
    return String((cfg && cfg.deviceUrl) || 'http://169.254.61.68/getvar.csv')
  } catch {
    return 'http://169.254.61.68/getvar.csv'
  }
}

async function tryFetch(url: string): Promise<string> {
  const ctrl = new AbortController()
  const tm = setTimeout(function () { ctrl.abort() }, 5000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.text()
  } finally { clearTimeout(tm) }
}

async function fetchWithFallbacks(deviceUrl: string): Promise<{ text: string; url: string }> {
  let candidates: string[] = []
  try {
    const swap = deviceUrl.indexOf('getvar.csv') > -1 ? deviceUrl.replace('getvar.csv', 'vars.htm') : deviceUrl.indexOf('vars.htm') > -1 ? deviceUrl.replace('vars.htm', 'getvar.csv') : ''
    if (swap) candidates.push(swap)
    const u = new URL(deviceUrl)
    candidates = [deviceUrl, swap, u.origin + '/getvar.csv', u.origin + '/vars.htm', u.origin + '/pgd/getvar.csv', u.origin + '/pgd/vars.htm', u.origin + '/http/getvar.csv', u.origin + '/http/vars.htm'].filter(Boolean) as string[]
  } catch {
    candidates = [deviceUrl]
  }
  let lastErr: any = null
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    try { const text = await tryFetch(c); return { text, url: c } } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('All upstream endpoints failed')
}

export async function GET(req: NextRequest) {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-cache')

  const keysParam = req.nextUrl.searchParams.get('keys') || ''
  const keys = keysParam.split(',').map(s => s.trim()).filter(Boolean)

  const deviceUrl = await readConfigDeviceUrl()
  const now = Date.now()

  try {
    if (keys.length) {
      try {
        const origin = new URL(deviceUrl).origin
        async function readOne(k: string): Promise<{ k: string, v: string | null }> {
          const candidates = [origin + '/getvar.csv?id=' + encodeURIComponent(k), origin + '/pgd/getvar.csv?id=' + encodeURIComponent(k), origin + '/http/getvar.csv?id=' + encodeURIComponent(k)]
          let lastErr: any = null
          for (let i = 0; i < candidates.length; i++) {
            try {
              const tx = await tryFetch(candidates[i])
              const rr = parseResponse(tx) || []
              const found = rr.find(function (r) { return String(r.name).trim() === String(k).trim() }) || rr[0]
              const v = found ? found.value : null
              if (v != null) return { k, v }
            } catch (e) { lastErr = e }
          }
          return { k, v: null }
        }
        const pairs = await Promise.all(keys.map(readOne))
        const valuesQuick: Record<string, string> = {}
        pairs.forEach(function (p) { if (p.v != null) valuesQuick[p.k] = String(p.v) })
        if (Object.keys(valuesQuick).length) {
          cache.map = { ...cache.map, ...valuesQuick }
          cache.url = origin + '/getvar.csv'
          cache.text = ''
          cache.at = now
          return new NextResponse(JSON.stringify({ ok: true, url: cache.url, ts: now, values: valuesQuick, allCount: Object.keys(cache.map).length }), { status: 200, headers })
        }
      } catch {}
    }
    if (cache.text && (now - cache.at) <= TTL) {
      const values: Record<string, string> = {}
      if (keys.length) keys.forEach(function (k) { if (k in cache.map) values[k] = cache.map[k] })
      return new NextResponse(JSON.stringify({ ok: true, url: cache.url, ts: cache.at, values, allCount: Object.keys(cache.map).length }), { status: 200, headers })
    }
    const { text, url } = await fetchWithFallbacks(deviceUrl)
    const rows = parseResponse(text)
    const map: Record<string, string> = {}
    rows.forEach(function (r) { map[r.name] = r.value })
    cache.map = map
    cache.text = text
    cache.at = now
    cache.url = url
    const values: Record<string, string> = {}
    if (keys.length) keys.forEach(function (k) { if (k in map) values[k] = map[k] })
    if ((!values || Object.keys(values).length === 0) && keys.length) {
      try {
        const origin = new URL(url).origin
        async function readOne(k: string): Promise<{ k: string, v: string | null }> {
          const candidates = [origin + '/getvar.csv?id=' + encodeURIComponent(k), origin + '/pgd/getvar.csv?id=' + encodeURIComponent(k), origin + '/http/getvar.csv?id=' + encodeURIComponent(k)]
          let lastErr: any = null
          for (let i = 0; i < candidates.length; i++) {
            try {
              const tx = await tryFetch(candidates[i])
              const rr = parseResponse(tx) || []
              const found = rr.find(function (r) { return String(r.name).trim() === String(k).trim() }) || rr[0]
              const v = found ? found.value : null
              if (v != null) return { k, v }
            } catch (e) { lastErr = e }
          }
          return { k, v: null }
        }
        const pairs = await Promise.all(keys.map(readOne))
        pairs.forEach(function (p) { if (p.v != null) values[p.k] = String(p.v) })
      } catch {}
    }
    return new NextResponse(JSON.stringify({ ok: true, url, ts: now, values, allCount: rows.length }), { status: 200, headers })
  } catch (e: any) {
    if (cache.text && (now - cache.at) <= TTL * 6) {
      const values: Record<string, string> = {}
      if (keys.length) keys.forEach(function (k) { if (k in cache.map) values[k] = cache.map[k] })
      return new NextResponse(JSON.stringify({ ok: false, okCached: true, url: cache.url, ts: cache.at, values, allCount: Object.keys(cache.map).length }), { status: 200, headers })
    }
    return new NextResponse(JSON.stringify({ ok: false, error: (e && e.message) || 'Upstream error' }), { status: 503, headers })
  }
}