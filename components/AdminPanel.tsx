"use client"
import React, { useEffect, useState } from 'react'

type UnitCfg = { name: string; vars?: any }

export default function AdminPanel() {
  const [units, setUnits] = useState<UnitCfg[]>([])
  const [deviceIp, setDeviceIp] = useState('')
  const [newName, setNewName] = useState('')
  const [newIp, setNewIp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchConfig() {
    setError('')
    try {
      const r = await fetch('/api/admin/config')
      const resp = await r.json()
      if (!r.ok || !resp.ok) { setError(resp.error || 'خطا در دریافت پیکربندی'); return }
      const cfg = resp.config || {}
      setUnits(cfg.units || [])
      const devUrl = String(cfg.deviceUrl || '')
      const ip = devUrl ? devUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : ''
      setDeviceIp(ip)
    } catch { setError('خطای شبکه') }
  }

  useEffect(function () { fetchConfig() }, [])

  async function saveDeviceIp() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'setDeviceIp', ip: deviceIp }) })
      const resp = await r.json()
      if (!r.ok || !resp.ok) { setError(resp.error || 'خطا در ذخیره IP'); return }
      await fetchConfig()
    } catch { setError('خطای شبکه') } finally { setLoading(false) }
  }

  async function addUnit() {
    if (!newName.trim()) { setError('نام کارت الزامی است'); return }
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', name: newName, ip: newIp }) })
      const resp = await r.json()
      if (!r.ok || !resp.ok) { setError(resp.error || 'خطا در افزودن کارت'); return }
      setNewName(''); setNewIp('')
      await fetchConfig()
    } catch { setError('خطای شبکه') } finally { setLoading(false) }
  }

  async function updateUnit(idx: number) {
    const name = window.prompt('نام جدید کارت', units[idx].name || '') || ''
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', index: idx, name }) })
      const resp = await r.json()
      if (!r.ok || !resp.ok) { setError(resp.error || 'خطا در ویرایش کارت'); return }
      await fetchConfig()
    } catch { setError('خطای شبکه') } finally { setLoading(false) }
  }

  async function deleteUnit(idx: number) {
    if (!window.confirm('حذف این کارت؟')) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', index: idx }) })
      const resp = await r.json()
      if (!r.ok || !resp.ok) { setError(resp.error || 'خطا در حذف کارت'); return }
      await fetchConfig()
    } catch { setError('خطای شبکه') } finally { setLoading(false) }
  }

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/' } catch {}
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>پنل مدیریت</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={function(){ try { window.location.href = '/' } catch {} }}>بازگشت به داشبورد</button>
          <button className="btn" onClick={logout}>خروج</button>
        </div>
      </div>

      <div className="alert alert-danger" style={{ display: error ? '' : 'none' }}>{error}</div>

      <div className="control" style={{ marginBottom: 16 }}>
        <h6>IP دستگاه</h6>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" className="form-control" placeholder="169.254.61.68" value={deviceIp} onChange={e => setDeviceIp((e.target as HTMLInputElement).value)} />
          <button className="btn btn-primary" onClick={saveDeviceIp} disabled={loading}>ذخیره IP</button>
        </div>
      </div>

      <div className="control" style={{ marginBottom: 16 }}>
        <h6>افزودن کارت چیلر</h6>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 8 }}>
          <input type="text" className="form-control" placeholder="نام چیلر" value={newName} onChange={e => setNewName((e.target as HTMLInputElement).value)} />
          <input type="text" className="form-control" placeholder="IP اختیاری" value={newIp} onChange={e => setNewIp((e.target as HTMLInputElement).value)} />
          <button className="btn btn-primary" onClick={addUnit} disabled={loading}>افزودن</button>
        </div>
      </div>

      <div className="control">
        <h6>کارت‌ها</h6>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
          {(units || []).map(function (u, idx) {
            return (
              <React.Fragment key={idx}>
                <div style={{ padding: 6 }}><strong>{u.name}</strong></div>
                <button className="btn" onClick={() => updateUnit(idx)}>ویرایش</button>
                <button className="btn" onClick={() => deleteUnit(idx)}>حذف</button>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
