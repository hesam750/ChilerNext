import React from 'react'

export default function Fan({ running, alarm, stopped, animDuration, blurPx }: { running: boolean; alarm: boolean; stopped: boolean; animDuration: string; blurPx: string }) {
  return (
    <div className={`fan ${running ? 'running' : ''} ${alarm ? 'alarm' : ''} ${stopped ? 'stopped' : ''}`}>
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style={{ filter: `blur(${blurPx})` }}>
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
        <g className="blade" style={{ animationDuration: animDuration }}>
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
  )
}