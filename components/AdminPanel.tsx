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
  const [editOpen, setEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editIp, setEditIp] = useState('')

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

  function openEdit(idx: number) {
    setEditIndex(idx)
    setEditName((units[idx] && units[idx].name) || '')
    setEditIp(deviceIp || '')
    setEditOpen(true)
  }

  function closeEdit(){
    setEditOpen(false)
    setEditIndex(null)
    setEditName('')
    setEditIp('')
  }

  async function saveEdit(){
    if (editIndex === null) return
    const name = editName.trim()
    const ip = editIp.trim()
    if (!name) return
    setLoading(true)
    setError('')
    try {
      const payload: any = { action: 'update', index: editIndex, name }
      if (ip) payload.ip = ip
      const r = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const resp = await r.json()
      if (!r.ok || !resp.ok) { setError(resp.error || 'خطا در ویرایش کارت'); return }
      await fetchConfig()
      closeEdit()
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
                <button className="btn" onClick={() => openEdit(idx)}>ویرایش</button>
                <button className="btn" onClick={() => deleteUnit(idx)}>حذف</button>
              </React.Fragment>
            )
          })}
        </div>
      </div>
      <div style={{ display: editOpen ? 'block' : 'none' }}>
        <div style={{ position:'fixed', inset:0 as any, background:'rgba(0,0,0,.35)', backdropFilter:'blur(2px)', zIndex:1000 }} onClick={closeEdit} />
        <div style={{ position:'fixed', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:'min(480px, 92vw)', background:'#fff', borderRadius:12, boxShadow:'0 12px 32px rgba(0,0,0,.25)', zIndex:1001, padding:16 }}>
          <h4 style={{ marginTop:0, marginBottom:12 }}>ویرایش کارت</h4>
          <div className="control" style={{ marginBottom:10 }}>
            <label>نام کارت</label>
            <input type="text" className="form-control" value={editName} onChange={e => setEditName((e.target as HTMLInputElement).value)} />
          </div>
          <div className="control" style={{ marginBottom:10 }}>
            <label>IP دستگاه (اختیاری)</label>
            <input type="text" className="form-control" placeholder="مثال: 169.254.61.68" value={editIp} onChange={e => setEditIp((e.target as HTMLInputElement).value)} />
            <small className="text-muted">اگر IP را تغییر دهید، IP دستگاه اصلی به‌روز می‌شود.</small>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
            <button className="btn" onClick={closeEdit}>انصراف</button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={loading}>ذخیره</button>
          </div>
        </div>
      </div>
    </div>
  )
}
