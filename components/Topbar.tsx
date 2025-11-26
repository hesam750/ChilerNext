"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

export default function Topbar({
  connectionClass,
  connectionText,
  onToggleTheme,
  themeLabel,
}: { connectionClass: string; connectionText: string; onToggleTheme: () => void; themeLabel: string }) {
  const [logoOk, setLogoOk] = useState(true)
  return (
    <div className="topbar">
      <div className="brand">
        {logoOk ? (
          <Image src="/fanap.png" width={28} height={28} alt="Fanap" onError={() => { setLogoOk(false) }} className="logo" />
        ) : (
          <div className="logo-fallback" />
        )}
        <div className="brand-text">
          <span className="title">داشبورد چیلر</span>
          <span className="subtitle">سیستم مدیریت سرمایش</span>
        </div>
      </div>
      
      <div className="actions">
        <div className="status">
          <span className={`status-dot ${connectionClass}`} />
          <span className="status-text">{connectionText}</span>
        </div>
        
        <button 
          className="virtual-display-btn" 
          onClick={() => { try { window.open('http://169.254.61.68//pgd/index.htm','_blank') } catch {} }}
          title="نمایشگر مجازی"
        >
          <span className="btn-icon">📺</span>
        </button>
        
        <button 
          className="theme-btn" 
          onClick={onToggleTheme}
          title={themeLabel}
        >
          <span className="theme-icon">{themeLabel === 'Light' ? '☀️' : '🌙'}</span>
        </button>

        <AuthButtons />
      </div>
    </div>
  )
}

function AuthButtons() {
  const [role, setRole] = useState<'guest'|'user'|'admin'>('guest')
  useEffect(function(){
    let mounted = true
    fetch('/api/auth/me').then(function(r){ return r.json() }).then(function(d){ if (mounted) setRole((d && d.role) || 'guest') }).catch(function(){ if (mounted) setRole('guest') })
    return function(){ mounted = false }
  }, [])
  function onLogout(){ fetch('/api/auth/logout', { method: 'POST' }).catch(function(){}).finally(function(){ try { window.location.href = '/' } catch {} }) }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {role === 'admin' ? (<a href="/admin" className="nav-btn" title="مدیریت">مدیریت</a>) : null}
      {role !== 'guest' ? (<button type="button" className="nav-btn" onClick={onLogout} title="خروج">خروج</button>) : (<a href="/login" className="nav-btn" title="ورود">ورود</a>)}
    </div>
  )
}
