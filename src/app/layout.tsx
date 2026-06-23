import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

const themeScript = `
  (function () {
    try {
      var saved = localStorage.getItem('shearwater-theme');
      var theme = saved === 'light' || saved === 'dark'
        ? saved
        : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (_) {
      document.documentElement.dataset.theme = 'dark';
    }
  })();
`

export const metadata: Metadata = {
  title: { default: 'Shearwater Operations', template: '%s · Shearwater' },
  description: 'Shearwater Victoria Falls AI Operations Platform',
  icons: { icon: '/swicon.png' },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
