import React, { useState } from 'react'

export default function Topbar({ connectionClass, connectionText, onToggleTheme, themeLabel }: { connectionClass: string; connectionText: string; onToggleTheme: () => void; themeLabel: string }) {
  const [logoOk, setLogoOk] = useState(true)
  return (
    <div className="topbar">
      <div className="brand">
        {logoOk ? (
          <img src="/fanap.png" alt="Fanap" onError={function(){ setLogoOk(false) }} />
        ) : (
          <div className="brand-fallback" />
        )}
        <strong>داشبورد چیلر</strong>
      </div>
      <div className="top-actions">
        <div className="conn-card">
          <span className={`status-dot ${connectionClass}`} />
          <span className="conn-text">{connectionText}</span>
        </div>
        <button className="btn btn-sm btn-primary" type="button" onClick={function(){ try { window.open('https://assist-nutrition-disabled-architects.trycloudflare.com/pgd/index.htm','_blank') } catch {} }}>نمایشگر مجازی</button>
        <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label="theme-toggle">
          <span className="icon sun">☀️</span>
          <span className="icon moon">🌙</span>
          <span className="knob" />
        </button>
      </div>
    </div>
  )
}