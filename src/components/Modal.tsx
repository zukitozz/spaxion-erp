'use client'

import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8" onClick={onClose}>
      <div
        className="card-surface max-h-full w-full max-w-lg overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-emerald-900">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}
