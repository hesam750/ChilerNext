"use client"
import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const styles = useMemo(function(){ return `
  :root{
    --bg-primary: linear-gradient(180deg, #0a0f1a 0%, #0d1220 100%);
    --fg-primary: #e5e7eb;
    --muted: #94a3b8;
    --accent-primary: #3b82f6;
    --accent-primary-dark: #2563eb;
    --danger: #ef4444;
  }
  .wrap{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-primary)}
  .card-wrap{position:relative;display:flex;align-items:center;justify-content:center;width:100%;max-width:520px}
  .fan-login{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:clamp(360px,140%,640px);height:clamp(360px,140%,640px);border-radius:50%;background:transparent;border:0;box-shadow:none;filter:saturate(1.05) contrast(1.04);pointer-events:none;z-index:0}
  .fan-login svg{width:100%;height:100%;filter:drop-shadow(0 20px 80px rgba(0,0,0,.4))}
  .fan-login .blade{transform-origin:50% 50%;animation:spin 8s linear infinite;will-change:transform}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion: reduce){.fan-login .blade{animation:none !important}}
  .card{position:relative;z-index:1;max-width:520px;width:100%;padding:40px 32px;border-radius:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(16px) saturate(130%);-webkit-backdrop-filter:blur(16px) saturate(130%);box-shadow:0 12px 40px rgba(0,0,0,.35)}
  .brand{font-size:24px;font-weight:800;color:var(--fg-primary);margin-bottom:8px;letter-spacing:.5px}
  .subtitle{font-size:14px;color:var(--muted);margin-bottom:20px}
  .form-group{margin-top:16px}
  .form-label{display:block;color:var(--muted);font-size:13px;margin-bottom:8px}
  .form-input{width:100%;border-radius:12px;border:1px solid rgba(148,163,184,0.3);background:rgba(10,15,26,0.6);color:var(--fg-primary);padding:12px 14px;font-size:15px;transition:all .3s ease}
  .form-input::placeholder{color:rgba(180,188,200,0.6)}
  .form-input:focus{outline:none;border-color:var(--accent-primary);background:rgba(10,15,26,0.8);box-shadow:0 0 0 3px rgba(59,130,246,0.1)}
  .form-input:hover:not(:focus){border-color:rgba(59,130,246,0.3)}
  .error{color:var(--danger);font-size:13px;margin-top:8px;display:none;animation:shake .4s ease-in-out}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  .actions{display:block;margin-top:28px}
  .btn{border-radius:12px;border:none;font-family:'Vazirmatn',Tahoma,Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 24px;cursor:pointer;transition:all .3s ease;text-transform:uppercase;letter-spacing:.5px}
  .actions .btn{width:100%;padding:14px 24px;font-size:16px}
  .btn-primary{background:linear-gradient(135deg,var(--accent-primary) 0%,var(--accent-primary-dark) 100%);color:#fff;box-shadow:0 8px 24px rgba(59,130,246,.3)}
  .btn-primary:hover:not(:disabled){background:linear-gradient(135deg,var(--accent-primary-dark) 0%,#1d4ed8 100%);box-shadow:0 12px 32px rgba(59,130,246,.4);transform:translateY(-2px)}
  .btn-primary:active:not(:disabled){transform:translateY(0);box-shadow:0 4px 12px rgba(59,130,246,.2)}
  .btn:disabled{opacity:.6;cursor:not-allowed}
  .brand-logo{position:fixed;left:20px;bottom:20px;z-index:3;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(59,130,246,0.2);border-radius:14px;padding:10px 14px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);text-decoration:none;transition:all .3s ease}
  .brand-logo:hover{background:rgba(255,255,255,0.08);border-color:rgba(59,130,246,0.4);box-shadow:0 8px 24px rgba(59,130,246,0.1)}
  .brand-logo .txt{color:var(--fg-primary);font-weight:600;font-size:13px;letter-spacing:.3px}
  @media (max-width:768px){.wrap{padding:16px}.card{max-width:100%;padding:32px 24px}.fan-login{width:min(65vw,420px);height:min(65vw,420px)}.brand{font-size:22px}}
  @media (max-width:480px){.card{padding:28px 20px}.fan-login{width:min(75vw,300px);height:min(75vw,300px);box-shadow:inset 0 0 15px rgba(0,0,0,.7),0 4px 12px rgba(0,0,0,.4),0 0 40px rgba(59,130,246,.03)}.brand{font-size:20px}.brand-logo{left:14px;bottom:14px;padding:8px 10px}.brand-logo .txt{font-size:11px}}
  ` }, [])

  useEffect(function(){
    let canceled = false
    fetch('/api/auth/me').then(function(r){ return r.json() }).then(function(info){
      if (canceled) return
      const role = (info && info.role) || 'guest'
      if (role !== 'guest') {
        const params = new URLSearchParams(window.location.search || '')
        const next = params.get('next')
        if (next && next.trim()) router.replace(next)
        else if (role === 'admin') router.replace('/admin')
        else router.replace('/')
      }
    }).catch(function(){})
    return function(){ canceled = true }
  }, [router])

  function submitLogin() {
    setError("")
    if (!username.trim() || !password.trim()) { setError("نام کاربری و رمز عبور لازم است"); return }
    setLoading(true)
    fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      .then(function(r){ if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(function(info){ const role = (info && info.role) || 'user'; const params = new URLSearchParams(window.location.search || ''); const n = params.get('next'); if (n && n.trim()) router.replace(n); else if (role === 'admin') router.replace('/admin'); else router.replace('/') })
      .catch(function(){ setError("ورود نامعتبر") })
      .finally(function(){ setLoading(false) })
  }

  return (
    <div className="wrap">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="card-wrap">
        <div className="fan fan-login" aria-hidden="true">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bladeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#cfd5db" />
                <stop offset="40%" stopColor="#9aa2aa" />
                <stop offset="60%" stopColor="#858c94" />
                <stop offset="100%" stopColor="#d6dbe0" />
              </linearGradient>
              <linearGradient id="edgeHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                <stop offset="30%" stopColor="#ffffff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
              </linearGradient>
              <radialGradient id="hubMetal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e7eaee" />
                <stop offset="65%" stopColor="#c2c7ce" />
                <stop offset="100%" stopColor="#9ba2aa" />
              </radialGradient>
              <linearGradient id="shroudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#757c84" />
                <stop offset="100%" stopColor="#444a50" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="56" fill="url(#shroudGrad)" stroke="#2f3337" strokeWidth="4" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2327" strokeWidth="1" opacity="0.6" />
            <g className="blade">
              <g transform="translate(60,60)">
                <g id="blade6" fill="url(#bladeMetal)">
                  <path d="M 2 -18 C 8 -30, 22 -40, 34 -42 C 45 -44, 50 -42, 52 -38 C 54 -33, 49 -27, 42 -24 C 33 -20, 22 -15, 14 -9 C 6 -3, 0 4, -2 10 C -4 15, -6 18, -10 18 C -14 18, -16 14, -16 10 C -16 2, -10 -8, 2 -18 Z" stroke="#2d3237" strokeWidth="0.6" />
                  <path d="M 4 -16 C 12 -26, 24 -36, 36 -38" fill="none" stroke="url(#edgeHighlight)" strokeWidth="1" opacity="0.55" />
                </g>
                <use href="#blade6" transform="rotate(0)" />
                <use href="#blade6" transform="rotate(60)" />
                <use href="#blade6" transform="rotate(120)" />
                <use href="#blade6" transform="rotate(180)" />
                <use href="#blade6" transform="rotate(240)" />
                <use href="#blade6" transform="rotate(300)" />
              </g>
            </g>
            <circle cx="60" cy="60" r="11" fill="url(#hubMetal)" stroke="#3b4147" strokeWidth="0.9" />
            <circle cx="60" cy="60" r="4" fill="#343a40" />
            <g fill="#666b72" stroke="#2d3237" strokeWidth="0.5">
              <circle cx="60" cy="12" r="2" />
              <circle cx="60" cy="12" r="2" transform="rotate(60 60 60)" />
              <circle cx="60" cy="12" r="2" transform="rotate(120 60 60)" />
              <circle cx="60" cy="12" r="2" transform="rotate(180 60 60)" />
              <circle cx="60" cy="12" r="2" transform="rotate(240 60 60)" />
              <circle cx="60" cy="12" r="2" transform="rotate(300 60 60)" />
            </g>
          </svg>
        </div>

        <div className="card">
          <div className="brand">سیستم سرمایشی</div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">نام کاربری</label>
            <input id="login-username" type="text" className="form-input" placeholder="نام کاربری سازمانی" autoComplete="username" aria-label="نام کاربری" value={username} onChange={function(e){ setUsername((e.target as HTMLInputElement).value) }} />
          </div>
        <div className="form-group">
          <label className="form-label" htmlFor="login-password">رمز عبور</label>
          <input id="login-password" type="password" className="form-input" placeholder="رمز عبور خود را وارد کنید" autoComplete="current-password" aria-label="رمز عبور" value={password} onChange={function(e){ setPassword((e.target as HTMLInputElement).value) }} />
        </div>
        <div className="error" style={{ display: error ? '' : 'none' }}>{error}</div>
        <div className="actions">
          <button id="login-submit" className="btn btn-primary" onClick={submitLogin} disabled={loading}>{loading ? 'درحال ورود...' : 'ورود'}</button>
        </div>
        </div>
      </div>

      <a className="brand-logo" href="https://fanap.ir" target="_blank" rel="noopener" aria-label="Fanap Tech">
        <Image src="/fanap.png" alt="Fanap Tech" width={28} height={28} />
        <span className="txt">Fanap Tech</span>
      </a>
    </div>
  )
}

