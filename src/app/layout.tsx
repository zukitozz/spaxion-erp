import './globals.css'
import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Spaxión ERP',
  description: 'Sistema ERP/POS para centro estético Spaxión',
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <body>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  )
}
