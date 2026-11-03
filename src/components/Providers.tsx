'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>
    </SessionProvider>
  )
}
