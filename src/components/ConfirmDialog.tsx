'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'

interface ConfirmOptions {
  title: string
  mensaje: string
  /** Líneas de detalle (p. ej. "Total: S/ 200.00") mostradas debajo del mensaje. */
  detalle?: string[]
  textoConfirmar?: string
  /** Estilo rojo para operaciones destructivas. */
  peligro?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opciones, setOpciones] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((valor: boolean) => void) | null>(null)

  const confirmar = useCallback<ConfirmFn>((options) => {
    setOpciones(options)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const responder = (valor: boolean) => {
    resolver.current?.(valor)
    resolver.current = null
    setOpciones(null)
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {opciones && (
        <Modal title={opciones.title} onClose={() => responder(false)}>
          <p className="text-sm text-slate-700">{opciones.mensaje}</p>
          {opciones.detalle && opciones.detalle.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              {opciones.detalle.map((linea) => <li key={linea}>{linea}</li>)}
            </ul>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => responder(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => responder(true)}
              className={opciones.peligro
                ? 'rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700'
                : 'btn-brand'}
            >
              {opciones.textoConfirmar ?? 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  return context
}
