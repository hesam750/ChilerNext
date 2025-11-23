type BatchMap = Record<string, string | null | undefined>

export function VarsAdapter(baseUrl?: string) {
  let deviceUrl = baseUrl || 'http://169.254.61.68/getvar.csv'
  const TTL = 3000
  let inflight: Promise<string> | null = null
  let inflightAt = 0
  let lastText = ''
  let lastTime = 0
  let lastMap: Record<string, string> | null = null
  
  let variableMappings: Record<string, string> = {};
  function getMappedVariableName(dashboardVar: string): string {
    return variableMappings[dashboardVar] || dashboardVar;
  }
  function loadConfiguration() {
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        fetch('/assets/data/dashboard.config.json')
          .then(response => response.json())
          .then(config => {
            if (config.units && config.units.length > 0 && config.units[0].vars) {
              variableMappings = config.units[0].vars;
            }
          })
          .catch(error => {
            console.warn('Failed to load configuration');
          });
      }
    } catch (error) {
      console.warn('Configuration loading error');
    }
  }
  loadConfiguration();

  function proxied(u: string) { return '/api/proxy?url=' + encodeURIComponent(u) }

  function fetchJsonOnce(url: string) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    let timeoutId: any = null
    let timedOut = false
    if (ctrl) timeoutId = setTimeout(function () { timedOut = true; try { ctrl.abort() } catch {} }, 12000)
    return fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .catch(function (err) { if (timedOut && err && (err as any).name === 'AbortError') throw new Error('Timeout contacting device'); throw err })
      .finally(function () { if (timeoutId) try { clearTimeout(timeoutId) } catch {} })
  }

  function healthRead(keys: string[]) {
    const qs = keys && keys.length ? ('?keys=' + encodeURIComponent(keys.join(','))) : ''
    return fetchJsonOnce('/api/health' + qs).then(function (resp: any) {
      const values = (resp && resp.values) || {}
      if (resp && (resp.ok || resp.okCached)) return values
      throw new Error('Health read failed')
    })
  }

  function fetchOnce(url: string) {
    let attempts = 0
    function once(): Promise<string> {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
      let timeoutId: any = null
      let timedOut = false
      if (ctrl) timeoutId = setTimeout(function () { timedOut = true; try { ctrl.abort() } catch {} }, 12000)
      return fetch(proxied(url), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
        .catch(function (err) { if (timedOut && err && (err as any).name === 'AbortError') throw new Error('Timeout contacting device'); throw err })
        .finally(function () { if (timeoutId) try { clearTimeout(timeoutId) } catch {} })
    }
    function next(): Promise<string> { return once().catch(function (e) { attempts++; if (attempts >= 2) throw e; return new Promise(function (res) { setTimeout(res, 200) }).then(function () { return once() }) }) }
    return next()
  }

  function fetchOnceExt(method: string, url: string, body?: string) {
    let attempts = 0
    function once(): Promise<string> {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
      let timeoutId: any = null
      let timedOut = false
      const opts: any = { method: method || 'GET', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined, headers: {} }
      if (String(opts.method).toUpperCase() === 'POST') { opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'; opts.body = String(body || '') }
      if (ctrl) timeoutId = setTimeout(function () { timedOut = true; try { ctrl.abort() } catch {} }, 15000)
      return fetch(proxied(url), opts)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
        .catch(function (err) { if (timedOut && err && (err as any).name === 'AbortError') throw new Error('Timeout contacting device'); throw err })
        .finally(function () { if (timeoutId) try { clearTimeout(timeoutId) } catch {} })
    }
    function next(): Promise<string> { return once().catch(function (e) { attempts++; if (attempts >= 2) throw e; return new Promise(function (res) { setTimeout(res, 200) }).then(function () { return once() }) }) }
    return next()
  }

  function parseVarsTable(html: string) {
    try {
      const rows: { name: string; value: string; id?: string; desc?: string }[] = []
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
          const id = (tds[0] || name)
          if (name) rows.push({ id, name, desc: tds[2] || '', value })
        }
      }
      return rows
    } catch { return [] }
  }

  function parseVarsCsv(text: string) {
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
      function unq(s: any) { return String(s == null ? '' : s).replace(/^"(.*)"$/, '$1') }
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

  function parseResponse(text: string) {
    const t = String(text || '')
    const tt = t.trim()
    if (tt[0] === '<' || /<table/i.test(tt)) return parseVarsTable(t)
    const csv = parseVarsCsv(t)
    if (csv && csv.length) return csv
    return parseVarsTable(t)
  }

  function fetchVars(force?: boolean) {
    const now = Date.now()
    if (!force && lastText && (now - lastTime) <= TTL) return Promise.resolve(lastText)
    if (inflight && (now - inflightAt) <= TTL) return inflight
    inflightAt = now
    inflight = fetchOnce(deviceUrl).catch(function (err) {
      const candidates: string[] = []
      try {
        const swap = deviceUrl.indexOf('getvar.csv') > -1 ? deviceUrl.replace('getvar.csv', 'vars.htm') : deviceUrl.indexOf('vars.htm') > -1 ? deviceUrl.replace('vars.htm', 'getvar.csv') : ''
        if (swap) candidates.push(swap)
        const u = new URL(deviceUrl)
        candidates.push(u.origin + '/getvar.csv')
        candidates.push(u.origin + '/vars.htm')
        candidates.push(u.origin + '/pgd/getvar.csv')
        candidates.push(u.origin + '/pgd/vars.htm')
        candidates.push(u.origin + '/http/getvar.csv')
        candidates.push(u.origin + '/http/vars.htm')
      } catch {}
      let idx = 0
      function next(): Promise<string> {
        if (idx >= candidates.length) return Promise.reject(err)
        const target = candidates[idx++]
        return fetchOnce(target).then(function (t) { deviceUrl = target; return t }).catch(function () { return next() })
      }
      return next().catch(function () {
        if (lastText && (Date.now() - lastTime) <= (TTL * 6)) return Promise.resolve(lastText)
        return Promise.reject(err)
      })
    }).then(function (t) { lastText = t; lastTime = Date.now(); return t }).finally(function () { inflight = null })
    return inflight
  }

  function buildIndex(rows: { name: string; value: string }[]) { const idx: Record<string, string> = {}; rows.forEach(function (r) { idx[r.name] = r.value }); return idx }

  function readOneDirect(name: string) {
    if (name === '__probe__') return fetchVars(true).then(function () { return '1' })
    try {
      if (/getvar\.csv/i.test(deviceUrl)) {
        const base = deviceUrl.replace(/([?&].*)$/, '')
        const u = base + '?id=' + encodeURIComponent(name)
        return fetchOnce(u).then(function (txt) {
          const rows = parseResponse(txt) || []
          let v: any = null
          if (rows && rows.length) {
            const r = rows.find(function (x) { return String(x.name).trim() === String(name).trim() }) || rows[0]
            v = r && (r as any).value
          }
          return v
        })
      }
    } catch {}
    return fetchVars().then(function (txt) { const rows = parseResponse(txt) || []; const m = buildIndex(rows); return (m as any)[name] })
  }

  return {
    setBase(url: string) { deviceUrl = url },
    read(key: string) {
      if (key === '__probe__') return fetchVars(true).then(function () { return '1' })
      return healthRead([key]).then(function (m) { return (m as any)[key] }).catch(function () { return readOneDirect(key) })
    },
    batchRead(keys: string[]) {
      return healthRead(keys).catch(function () {
        return fetchVars().then(function (txt) {
          if (txt === lastText && lastMap) { const outCached: BatchMap = {}; keys.forEach(function (k) { (outCached as any)[k] = (lastMap as any)[k] }); return outCached }
          const rows = parseResponse(txt) || []; lastMap = buildIndex(rows); const out: BatchMap = {}; keys.forEach(function (k) { (out as any)[k] = (lastMap as any)[k] }); return out
        })
      })
    },
    write(name: string, value: any) {
      let base: string
      try {
        if (/getvar\.csv/i.test(deviceUrl)) base = deviceUrl.replace(/getvar\.csv/i, 'setvar.csv')
        else if (/vars\.htm/i.test(deviceUrl)) base = deviceUrl.replace(/vars\.htm/i, 'setvar.csv')
        else { const u = new URL(deviceUrl); base = u.origin + u.pathname.replace(/[^\/]+$/, '') + 'setvar.csv' }
      } catch { base = String(deviceUrl || '').replace(/[^\/]+$/, 'setvar.csv') }
      const bases: string[] = []
      try {
        const u = new URL(deviceUrl)
        bases.push(base)
        bases.push(u.origin + '/setvar.csv')
        bases.push(u.origin + '/pgd/setvar.csv')
        bases.push(u.origin + '/http/setvar.csv')
      } catch { bases.push(base) }
      
      // مپینگ متغیرها از پیکربندی - استفاده از نام واقعی دستگاه
      const deviceVarName = getMappedVariableName(name);
      
      const patterns = [
        // اولویت اول: فرمت مستقیم با نام واقعی دستگاه
        '?' + encodeURIComponent(deviceVarName) + '=' + encodeURIComponent(value),
        // دوم: فرمت مستقیم با نام اصلی (fallback)
        '?' + encodeURIComponent(name) + '=' + encodeURIComponent(value),
        // فرمت‌های قدیمی
        '?name=' + encodeURIComponent(deviceVarName) + '&value=' + encodeURIComponent(value),
        '?name=' + encodeURIComponent(name) + '&value=' + encodeURIComponent(value),
        '?name=' + encodeURIComponent(name) + '&val=' + encodeURIComponent(value),
        '?id=' + encodeURIComponent(name) + '&value=' + encodeURIComponent(value),
        '?var=' + encodeURIComponent(name) + '&val=' + encodeURIComponent(value)
      ]
      const getUrls: string[] = []
      bases.forEach(function (b) { patterns.forEach(function (p) { getUrls.push(b + p) }) })
      const postPairs: { b: string, body: string }[] = []
      const bodies = [
        // استفاده از نام واقعی دستگاه برای POST
        'name=' + encodeURIComponent(deviceVarName) + '&value=' + encodeURIComponent(value),
        'name=' + encodeURIComponent(name) + '&value=' + encodeURIComponent(value),
        'name=' + encodeURIComponent(name) + '&val=' + encodeURIComponent(value),
        'id=' + encodeURIComponent(name) + '&value=' + encodeURIComponent(value),
        'var=' + encodeURIComponent(name) + '&val=' + encodeURIComponent(value)
      ]
      bases.forEach(function (b) { bodies.forEach(function (body) { postPairs.push({ b, body }) }) })
      let gi = 0, pj = 0
      function tryGetNext(): Promise<string> {
        if (gi >= getUrls.length) return Promise.reject(new Error('All GET patterns failed for ' + name))
        const url = getUrls[gi++]
        return fetchOnce(url).then(function (t) { lastText = ''; lastMap = null; lastTime = 0; return t }).catch(function () { return tryGetNext() })
      }
      function tryPostNext(): Promise<string> {
        if (pj >= postPairs.length) return Promise.reject(new Error('All POST patterns failed for ' + name))
        const pair = postPairs[pj++]
        return fetchOnceExt('POST', pair.b, pair.body).then(function (t) { lastText = ''; lastMap = null; lastTime = 0; return t }).catch(function () { return tryPostNext() })
      }
      return tryGetNext().catch(function () { return tryPostNext() })
    }
  }
}