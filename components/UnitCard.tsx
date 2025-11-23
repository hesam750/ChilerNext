
import React, { useEffect, useMemo, useState } from 'react'
import Fan from './Fan'
import { VarsAdapter } from '../lib/varsAdapter'

type UnitCfg = {
  name: string
  vars: { PowerCmd?: string; PowerFb?: string; TempCurrent?: string; TempSetpoint?: string; FanSpeedFb?: string; AlarmActive?: string; ModeFb?: string; ModeCmd?: string }
  setpoint?: { min?: number; max?: number; step?: number }
  disabled?: boolean
}

function toBool(v: any) { if (v == null) return false; const n = Number(v); if (!isNaN(n)) return n > 0; const s = String(v).toLowerCase(); return s === '1' || s === 'on' || s === 'true' || s === 'running' || s === 'active' || s === 'enabled' }
function toNum(v: any) { const s = String(v == null ? '' : v).replace(',', '.'); const m = s.match(/-?\d+(?:\.\d+)?/); const n = m ? parseFloat(m[0]) : NaN; return isNaN(n) ? 0 : n }
function clamp(v: any, mn: number, mx: number) { v = Number(v); if (isNaN(v)) return mn; return Math.max(mn, Math.min(mx, v)) }

export default function UnitCard({ cfg, adapter, canWrite, connected, demo, pollingMs, values }: { cfg: UnitCfg; adapter: ReturnType<typeof VarsAdapter>; canWrite: boolean; connected: boolean; demo: boolean; pollingMs: number; values?: Record<string, string> }) {
  const [isDisabled, setIsDisabled] = useState(!!cfg.disabled)
  const [powerFb, setPowerFb] = useState(false)
  const [tempCurrent, setTempCurrent] = useState('0.0')
  const [modeFb, setModeFb] = useState('auto')
  const [fanSpeedFb, setFanSpeedFb] = useState(0)
  const [alarmActive, setAlarmActive] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [powerCmd, setPowerCmd] = useState(false)
  const [setpointCmd, setSetpointCmd] = useState(20)
  const spMin = cfg.setpoint && cfg.setpoint.min != null ? cfg.setpoint.min : 10
  const spMax = cfg.setpoint && cfg.setpoint.max != null ? cfg.setpoint.max : 30
  const spStep = cfg.setpoint && cfg.setpoint.step != null ? cfg.setpoint.step : 0.5
  const [setpointFb, setSetpointFb] = useState<number | null>(null)
  const [modeCmd, setModeCmd] = useState('auto')
  const lsKey = 'setpointCmd:' + cfg.name
  useEffect(function () { try { const saved = localStorage.getItem(lsKey); if (saved != null) setSetpointCmd(clamp(toNum(saved), spMin, spMax)) } catch {} }, [lsKey])
  useEffect(function () { try { localStorage.setItem(lsKey, String(setpointCmd)) } catch {} }, [lsKey, setpointCmd])
  useEffect(function () { if (!isBusy) setPowerCmd(!!powerFb) }, [powerFb, isBusy])
  useEffect(function () { if (!isBusy) setModeCmd(String(modeFb)) }, [modeFb, isBusy])

  const stateText = useMemo(function () { if (alarmActive) return 'هشدار'; return powerFb ? 'در حال کار' : 'متوقف' }, [alarmActive, powerFb])
  const stateBadgeClass = useMemo(function () { if (alarmActive) return 'badge-alarm'; return powerFb ? 'badge-running' : 'badge-stopped' }, [alarmActive, powerFb])
  const fanAnimDuration = useMemo(function () { const sp = Number(fanSpeedFb || 0); const factor = Math.min(2.75, Math.max(0, sp) / 900 * 2.75); const dur = 3 - factor; return dur.toFixed(2) + 's' }, [fanSpeedFb])
  const fanBlurPx = useMemo(function () { const sp = Number(fanSpeedFb || 0); const px = Math.max(0, Math.min(5, sp / 200)); return px.toFixed(2) + 'px' }, [fanSpeedFb])

  function onTogglePower() {
    if (isBusy) return
    const target = !powerCmd
    setPowerCmd(target)
    const varName = cfg.vars.PowerCmd
    if (!varName) return
    setIsBusy(true)
    adapter.write(varName!, target ? 1 : 0)
      .then(function () {})
      .catch(function () {
        if (!connected && demo) { setPowerCmd(target); setPowerFb(!!target); return }
        setPowerCmd(!target)
      })
      .finally(function () { setIsBusy(false) })
  }

  let lastSetAtRef = React.useRef<number | null>(null)
  function onApplySetpoint() {
    if (isBusy) return
    if (!canWrite && !(demo && !connected)) return
    const now = Date.now()
    if (lastSetAtRef.current && (now - lastSetAtRef.current) < 1000) return
    let v = Number(setpointCmd)
    if (isNaN(v)) return
    v = clamp(v, spMin, spMax)
    setSetpointCmd(v)
    const varName = cfg.vars.TempSetpoint
    if (!varName) return
    setIsBusy(true)
    lastSetAtRef.current = now
    if (demo && !connected) { setSetpointFb(v); setIsBusy(false); return }
    const desiredDot = v.toFixed(1)
    const desiredComma = desiredDot.replace('.', ',')
    const baseName = varName!.replace(/_Val$/,'')
    const altName = /RoomTempSetP/.test(varName!) ? 'UnitSetP.RoomTempSetP.Comfort' : ''
    const targetVars = [varName!, baseName, altName].filter(function(n, i, arr){ return !!n && arr.indexOf(n) === i })
    function delay(ms: number) { return new Promise(function (res) { setTimeout(res, ms) }) }
    function readbackAny() {
      return adapter.read(varName!).then(function (rv) {
        const s = String(rv == null ? '' : rv).replace(',', '.')
        const mm = s.match(/-?\d+(?:\.\d+)?/)
        const num = mm ? parseFloat(mm[0]) : NaN
        if (!isNaN(num)) return num
        throw new Error('no primary')
      }).catch(function () {
        const reads = targetVars.map(function (n) {
          return adapter.read(n).then(function (rv) {
            const s = String(rv == null ? '' : rv).replace(',', '.')
            const mm = s.match(/-?\d+(?:\.\d+)?/)
            const num = mm ? parseFloat(mm[0]) : NaN
            return { name: n, num }
          }).catch(function () { return { name: n, num: NaN } })
        })
        return Promise.all(reads).then(function (arr) { const any = arr.find(function (o) { return !isNaN(o.num) }); return any ? any.num : NaN })
      })
    }
    function trySetAll(valueStr: string) {
      let p: Promise<any> = Promise.resolve()
      targetVars.forEach(function (n) { p = p.then(function () { return adapter.write(n, valueStr) }).catch(function () {}) })
      return p.then(function () { return delay(900) }).then(function () { return readbackAny() }).then(function (num) { if (!isNaN(num) && Math.abs(num - v) <= 0.25) return { ok: true, actual: num }; return { ok: false, actual: num } }).catch(function () { return { ok: false, actual: NaN } })
    }
    function tryWriteWithFallbacks() { return trySetAll(desiredDot).then(function (res) { if (res && res.ok) return res; return trySetAll(desiredComma) }) }
    function tryUnlockThenWrite() {
      const unlockVars = ['PwdUser', 'PwdService', 'PwdManuf']
      const unlockCodes = ['1489', '1234']
      const seq: [string, string][] = []
      unlockVars.forEach(function (u) { unlockCodes.forEach(function (c) { seq.push([u, c]) }) })
      let idx = 0
      function next(): Promise<{ ok: boolean; actual: number }> {
        if (idx >= seq.length) return Promise.resolve({ ok: false, actual: NaN })
        const pair = seq[idx++]
        return adapter.write(pair[0], pair[1]).catch(function () { }).then(function () { return delay(600) }).then(function () { return tryWriteWithFallbacks() }).then(function (res) { if (res && res.ok) { return adapter.write(pair[0], '0').catch(function () { }).then(function () { return res }) } return next() })
      }
      return next()
    }
    tryWriteWithFallbacks().then(function (res) { return (res && res.ok) ? res : tryUnlockThenWrite() }).then(function (res) {
      if (res && res.ok) {
        const actual = Number(res.actual)
        if (!isNaN(actual)) { setSetpointFb(actual); const adj = clamp(+actual.toFixed(1), spMin, spMax); setSetpointCmd(adj) }
      }
    }).finally(function () { setIsBusy(false) })
  }

  useEffect(function () { setIsDisabled(!!cfg.disabled) }, [cfg.disabled])

  useEffect(function () {
    const keys = [cfg.vars.PowerFb, cfg.vars.TempCurrent, cfg.vars.ModeFb, cfg.vars.FanSpeedFb, cfg.vars.AlarmActive, cfg.vars.TempSetpoint].filter(Boolean) as string[]
    let mounted = true
    function poll() {
      if (!mounted) return
      if (!keys.length) return
      const src: Record<string, any> | null = values && Object.keys(values || {}).length ? values as any : null
      if (src) {
        if (cfg.vars.PowerFb && (cfg.vars.PowerFb in src)) setPowerFb(toBool((src as any)[cfg.vars.PowerFb]))
        if (cfg.vars.TempCurrent && (cfg.vars.TempCurrent in src)) setTempCurrent(toNum((src as any)[cfg.vars.TempCurrent]).toFixed(1))
        if (cfg.vars.ModeFb && (cfg.vars.ModeFb in src)) setModeFb(String((src as any)[cfg.vars.ModeFb]))
        if (cfg.vars.FanSpeedFb && (cfg.vars.FanSpeedFb in src)) setFanSpeedFb(toNum((src as any)[cfg.vars.FanSpeedFb] || 0))
        if (cfg.vars.AlarmActive && (cfg.vars.AlarmActive in src)) setAlarmActive(toBool((src as any)[cfg.vars.AlarmActive]))
        if (cfg.vars.TempSetpoint && (cfg.vars.TempSetpoint in src)) setSetpointFb(toNum((src as any)[cfg.vars.TempSetpoint]))
        return
      }
      return
    }
    poll()
    const id = setInterval(poll, Math.max(800, pollingMs || 1000))
    return function () { mounted = false; clearInterval(id) }
  }, [cfg, adapter, pollingMs, values])

  return (
    <div className={`card ${!powerFb && !alarmActive ? 'stopped' : ''} ${isDisabled ? 'card--disabled' : ''}`}>
      <div className="card-header">
        <div><strong>{cfg.name}</strong></div>
        <div><span className={`badge-state ${stateBadgeClass}`}>{stateText}</span></div>
      </div>
      <div className="card-body">
        <Fan running={powerFb} alarm={alarmActive} stopped={!powerFb && !alarmActive} animDuration={fanAnimDuration} blurPx={fanBlurPx} />
        <div className="controls">
          <div className="control">
            <h6>روشن/خاموش</h6>
            <div className="toggle">
              <label>
                <input className="form-check-input" type="checkbox" checked={powerCmd} disabled={isDisabled || !canWrite || isBusy} onChange={onTogglePower} />
                <span className="switch-label" style={{ marginInlineStart: 8 }}>{powerFb ? 'روشن' : 'خاموش'}</span>
              </label>
            </div>
          </div>
          <div className="control">
            <h6>نقطه تنظیم (°C)</h6>
            <div className="setpoint">
              <button className="btn-step minus" disabled={isDisabled || !canWrite || isBusy} onClick={function () { const v = clamp(Number(setpointCmd) - spStep, spMin, spMax); setSetpointCmd(+v.toFixed(1)) }}>-</button>
              <input type="range" value={setpointCmd} min={spMin} max={spMax} step={spStep} disabled={isDisabled || !canWrite || isBusy} onChange={function (e) { setSetpointCmd(Number((e.target as HTMLInputElement).value)) }} />
              <button className="btn-step plus" disabled={isDisabled || !canWrite || isBusy} onClick={function () { const v = clamp(Number(setpointCmd) + spStep, spMin, spMax); setSetpointCmd(+v.toFixed(1)) }}>+</button>
              <span className="value-big">{Number(setpointCmd).toFixed(1)}</span>
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>اعمال شده: <strong>{setpointFb == null ? '-' : setpointFb}</strong> °C</div>
            <button type="button" className="btn btn-primary btn-sm" disabled={isDisabled || !canWrite || isBusy} onClick={onApplySetpoint}>اعمال</button>
          </div>
          <div className="control">
            <h6>دما</h6>
            <div>فعلی: <strong>{tempCurrent}</strong> °C</div>
          </div>
        </div>
      </div>
      <div className="footer">
        <span style={{ display: alarmActive ? '' : 'none' }}>هشدار فعال</span>
        <span style={{ display: alarmActive ? 'none' : '' }}>بدون هشدار</span>
      </div>
    </div>
  )
}