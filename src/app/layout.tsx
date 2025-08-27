import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Scam Checker - URL Safety Analysis Tool',
  description: 'A comprehensive URL analysis tool that helps users identify potentially malicious websites through multi-factor risk assessment.',
  keywords: ['security', 'url analysis', 'scam detection', 'website safety'],
  authors: [{ name: 'Development Team' }],
  creator: 'Development Team',
  publisher: 'Scam Checker',
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  )
}