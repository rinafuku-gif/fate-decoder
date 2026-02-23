import React from "react"
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fate Decoder ─ AIパーソナルリーディング',
  description: '運命鑑定士 Grand Master が、6つの占術であなたの問いに答えます。',
  openGraph: {
    title: 'Fate Decoder ─ AIパーソナルリーディング',
    description: '運命鑑定士 Grand Master が、6つの占術であなたの問いに答えます。',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Fate Decoder ─ AIパーソナルリーディング',
    description: '運命鑑定士 Grand Master が、6つの占術であなたの問いに答えます。',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
