"use client"
import React, { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/Topbar'
import UnitCard from '../components/UnitCard'
import { VarsAdapter } from '../lib/varsAdapter'

type UnitCfg = {
  name: string
  vars: { PowerCmd?: string; PowerFb?: string; TempCurrent?: string; TempSetpoint?: string; FanSpeedFb?: string; AlarmActive?: string; ModeFb?: string; ModeCmd?: string }
  setpoint?: { min?: number; max?: number; step?: number }
  disabled?: boolean
}

export default function Page() {
  const [units, setUnits] = useState<UnitCfg[]>([])
  const [connectionClass, setConnectionClass] = useState('status-warn')
  const [connectionText, setConnectionText] = useState('در حال اتصال...')
  const [pollingMs, setPollingMs] = useState(1000)
  const [lastError, setLastError] = useState('')
  const [strictMode, setStrictMode] = useState(true)
  const [writeWhitelist, setWriteWhitelist] = useState<string[]>(['رول کاعد'])
  const [isConnected, setIsConnected] = useState(false)
  const [demo, setDemo] = useState(false)
  const [adapter, setAdapter] = useState(VarsAdapter())
  const [serverValues, setServerValues] = useState<Record<string, string>>({})

  function canWriteUnit(name: string) { if (!isConnected) return false; if (strictMode) return writeWhitelist.indexOf(name) !== -1; return true }

  const themeLabel = useMemo(function () { try { if (typeof document !== 'undefined') { const t = document.documentElement.getAttribute('data-theme'); return t === 'light' ? 'روشن' : 'تاریک' } } catch {} return 'تاریک' }, [connectionText])
  function applyTheme(t: string) { document.documentElement.setAttribute('data-theme', t); const label = document.getElementById('theme-label'); if (label) label.textContent = t === 'dark' ? 'تاریک' : 'روشن' }
  function onToggleTheme() { const root = document.documentElement; const next = (root.getAttribute('data-theme') === 'dark') ? 'light' : 'dark'; applyTheme(next); try { localStorage.setItem('dashboard-theme', next) } catch {} }

  useEffect(function () { let saved: string | null = null; try { saved = localStorage.getItem('dashboard-theme') } catch { saved = null } if (!saved) { try { saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light' } catch { saved = 'light' } } applyTheme(saved || 'light'); try { localStorage.setItem('dashboard-theme', saved || 'light') } catch {} }, [])

  useEffect(function () {
    const m = (location.search || '').match(/[?&]demo=(\d+)/i)
    setDemo(!!(m && m[1] === '1'))
    const qDev = (() => { try { const mm = (location.search || '').match(/[?&]device=([^&]+)/i); return mm ? decodeURIComponent(mm[1]) : null } catch { return null } })()
    fetch('/assets/data/dashboard.config.json').then(function (r) { return r.json() }).then(function (cfg) {
      setPollingMs((cfg && cfg.pollingMs) || 1000)
      const devUrl = qDev || (cfg && cfg.deviceUrl)
      const a = VarsAdapter(devUrl)
      setAdapter(a)
      const arr = (cfg && cfg.units) || []
      const maxSlots = 10
      const filled = arr.slice()
      while (filled.length < maxSlots) filled.push({ name: 'رول کاعد', vars: {}, disabled: true })
      setUnits(filled)
    }).catch(function () {
      const arr: UnitCfg[] = [{ name: 'رول کاعد', vars: {} }]
      const maxSlots = 10
      while (arr.length < maxSlots) arr.push({ name: 'رول کاعد', vars: {}, disabled: true })
      setUnits(arr as any)
    })
  }, [])

  useEffect(function () {
    let timer: any = null
    let ticking = false
    let consecutiveFails = 0
    let successStreak = 0
    let isPaused = false
    function onVis() { isPaused = document.hidden }
    document.addEventListener('visibilitychange', onVis)
    function tick() {
      if (isPaused) { timer = setTimeout(tick, Math.max(pollingMs * 3, 3000)); return }
      if (ticking) { timer = setTimeout(tick, pollingMs); return }
      ticking = true
      const allKeys: string[] = []
      units.forEach(function (u) { const kk = [u.vars.PowerFb, u.vars.TempCurrent, u.vars.ModeFb, u.vars.FanSpeedFb, u.vars.AlarmActive, u.vars.TempSetpoint].filter(Boolean) as string[]; kk.forEach(function (k) { if (allKeys.indexOf(k) === -1) allKeys.push(k) }) })
      const url = '/api/health' + (allKeys.length ? ('?keys=' + encodeURIComponent(allKeys.join(','))) : '')
      fetch(url).then(function (r) { return r.json() }).then(function (resp) {
        const ok = !!(resp && resp.ok)
        const values = (resp && resp.values) || {}
        const allRejected = !ok && !resp.okCached
        if (allRejected) {
            consecutiveFails++
            successStreak = 0
            if (consecutiveFails >= 4) {
              setIsConnected(false)
              setConnectionClass('status-err')
              setConnectionText('بدون اتصال')
            } else if (consecutiveFails >= 2) {
              setIsConnected(false)
              setConnectionClass('status-warn')
              setConnectionText('قطع موقت')
            } else {
              setIsConnected(true)
              setConnectionClass('status-warn')
              setConnectionText('در حال اتصال...')
            }
            const msg = 'Connection failed'
            setLastError(msg)
          } else if (ok || resp.okCached) {
            setIsConnected(true)
            consecutiveFails = 0
            successStreak++
            setLastError('')
            setConnectionClass('status-ok')
            setConnectionText('متصل')
            try {
              const valuesMap = values as Record<string, string>
              setServerValues(valuesMap)
            } catch {}
          } else {
            setIsConnected(false)
            consecutiveFails = 0
            successStreak = 0
            setLastError('')
            setConnectionClass('status-warn')
            setConnectionText('ناقص')
          }
      }).catch(function () { consecutiveFails++; successStreak = 0; setIsConnected(false); setConnectionClass('status-warn'); setConnectionText('قطع موقت') }).finally(function () { ticking = false; let delay = pollingMs; if (consecutiveFails > 3) delay = pollingMs * 3; else if (consecutiveFails > 0) delay = Math.max(pollingMs, 1500); else { if (successStreak >= 6) delay = Math.max(300, Math.floor(pollingMs * 0.4)); else if (successStreak >= 3) delay = Math.max(500, Math.floor(pollingMs * 0.6)); } timer = setTimeout(tick, delay) })
    }
    tick()
    return function () { document.removeEventListener('visibilitychange', onVis); if (timer) clearTimeout(timer) }
  }, [adapter, units, pollingMs])

  useEffect(function () {
    if (!demo) { const span = document.getElementById('cpco-version'); if (span) span.textContent = 'Info unavailable'; return }
    const spanId = 'cpco-version'
    fetch('/api/proxy?url=https://assist-nutrition-disabled-architects.trycloudflare.com/').then(function (r) { return r.text() }).then(function (t) {
      const m = t.match(/C\.pCO\s+Webkit\s+version\s*([^\s<]+)/i)
      const info = m ? ('Webkit ' + m[1]) : (t.replace(/\s+/g, ' ').trim().slice(0, 80))
      const span = document.getElementById(spanId)
      if (span) span.textContent = info
    }).catch(function () { const span = document.getElementById(spanId); if (span) span.textContent = 'Info unavailable' })
  }, [demo])

  useEffect(function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(function (registration) {
          registration.addEventListener('updatefound', function () {
            const newWorker = registration.installing
            if (!newWorker) return
            newWorker.addEventListener('statechange', function () {
              if ((newWorker as any).state === 'installed' && navigator.serviceWorker.controller) {
                if (window.confirm('نسخه جدید موجود است! بروزرسانی؟')) window.location.reload()
              }
            })
          })
        }).catch(function () {})
      })
    }
  }, [])

  return (
    <div>
      <Topbar connectionClass={connectionClass} connectionText={connectionText} onToggleTheme={onToggleTheme} themeLabel={themeLabel} />
      <div className="alert-holder">
        <div className="alert alert-danger" style={{ display: lastError ? '' : 'none' }}>{lastError}</div>
      </div>
      
      <div className="cards">
        {units.map(function (u, idx) {
          const canWrite = isConnected && (strictMode ? writeWhitelist.indexOf(u.name) !== -1 : true)
          return <UnitCard key={idx} cfg={u} adapter={adapter} canWrite={canWrite} connected={isConnected} demo={demo} pollingMs={pollingMs} values={serverValues} />
        })}
      </div>
    </div>
  )
}