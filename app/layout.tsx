import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { Providers } from './providers'
import PendoScript from '@/components/PendoScript'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
  },
  title: {
    default: 'VVG Document Processing Template',
    template: '%s | VVG Template'
  },
  description: 'Production-ready document processing template with upload, extraction, and comparison features',
  keywords: ['document processing', 'template analysis', 'PDF extraction', 'document comparison'],
  authors: [{ name: 'VVG Team' }],
  openGraph: {
    title: 'VVG Document Processing Template',
    description: 'Production-ready document processing template',
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
      <body>
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
