import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Geneanext — GEDCOM to printable family tree poster',
  description:
    'Turn a GEDCOM file into a print-ready ancestor chart. Runs entirely in your browser; your file is never uploaded.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
