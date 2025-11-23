import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chiller Dashboard',
  description: 'CAREL Chiller Control Dashboard - Monitor and control your chiller system'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#007bff" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/fanap.png" />
        <link rel="apple-touch-icon" href="/fanap.png" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/css/bootstrap.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}