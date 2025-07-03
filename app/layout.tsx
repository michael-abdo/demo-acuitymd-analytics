import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { Providers } from './providers'
import PendoScript from '@/components/PendoScript'

export const metadata: Metadata = {
  title: 'Truck Hunter',
  description: 'Find trucks and pricing information',
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
          {children}
        </Providers>
      </body>
    </html>
  )
}
