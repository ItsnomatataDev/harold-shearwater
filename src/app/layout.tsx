import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ThemeInitializer } from '@/components/theme/ThemeInitializer'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Shearwater Operations', template: '%s · Shearwater' },
  description: 'Shearwater Victoria Falls AI Operations Platform',
  icons: { icon: '/swicon.png' },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeInitializer />
        {children}
      </body>
    </html>
  )
}
