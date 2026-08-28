import './globals.css'
import type { Metadata } from 'next'
import { Nunito, Playfair_Display } from 'next/font/google'
import { Providers } from '@/components/Providers'
import { AppShell } from '@/components/AppShell'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Spaxión ERP',
  description: 'Sistema ERP/POS para centro estético Spaxión',
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="es-PE" className={`${playfairDisplay.variable} ${nunito.variable}`}>
      <body>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  )
}
