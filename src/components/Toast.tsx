'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ToastTipo = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  tipo: ToastTipo
  mensaje: string
}

interface ToastContextValue {
  mostrar: (mensaje: string, tipo?: ToastTipo) => void
  success: (mensaje: string) => void
  error: (mensaje: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ESTILOS: Record<ToastTipo, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-slate-200 bg-white text-slate-900',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const mostrar = useCallback((mensaje: string, tipo: ToastTipo = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, tipo, mensaje }])
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 5000)
  }, [])

  const value: ToastContextValue = {
    mostrar,
    success: (mensaje) => mostrar(mensaje, 'success'),
    error: (mensaje) => mostrar(mensaje, 'error'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg ${ESTILOS[toast.tipo]}`}
          >
            {toast.mensaje}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider')
  return context
}
