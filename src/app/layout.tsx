import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Navbar } from '@/components/navbar'
import { Providers } from './providers'
import PendoScript from '@/components/PendoScript'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  title: {
    default: 'AcuityMD Infrastructure Platform For Medtech Data And Software Applications',
    template: '%s | AcuityMD'
  },
  description: 'Infrastructure platform for MedTech data and software applications. Visualize product approvals, market penetration, and FDA process tracking.',
  keywords: ['medtech', 'FDA approval', 'medical devices', 'market penetration', 'analytics'],
  authors: [{ name: 'Michael Abdo' }],
  openGraph: {
    title: 'AcuityMD MedTech Analytics Platform',
    description: 'Infrastructure platform for MedTech data and software applications',
    type: 'website',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <Providers>
          <PendoScript />
          <Navbar />
          <div className="pt-14">
            {children}
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
