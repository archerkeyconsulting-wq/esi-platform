import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NARO - Execution Intelligence Platform',
  description: 'Measure execution quality and identify gaps in your operations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
