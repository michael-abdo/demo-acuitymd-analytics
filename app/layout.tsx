import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { Providers } from './providers'
import PendoScript from '@/components/PendoScript'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  icons: {
    icon: '/${PROJECT_NAME}/favicon.ico',
  },
  title: '${PROJECT_DISPLAY_NAME}',
  description: 'AI-powered NDA document analysis and comparison tool',
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
