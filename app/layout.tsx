import './globals.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'

const byekan = localFont({
  src: '../BYekan.ttf',
  display: 'swap',
  weight: '400',
  style: 'normal',
  variable: '--font-byekan'
})

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
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/css/bootstrap.min.css" />
      </head>
      <body className={`${byekan.className} ${byekan.variable}`}>{children}</body>
    </html>
  )
}
