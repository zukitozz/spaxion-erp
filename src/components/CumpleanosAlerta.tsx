'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'

interface Cumpleanero { clienteId: string; nombre: string; celular: string | null }
interface Alerta { ayer: Cumpleanero[]; hoy: Cumpleanero[]; manana: Cumpleanero[] }

export const CLAVE_ALERTA_CUMPLEANOS = 'cumpleanos-alerta-vista'

const SECCIONES: { clave: keyof Alerta; titulo: string; estilo: string }[] = [
  { clave: 'hoy', titulo: '🎂 Cumplen hoy', estilo: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  { clave: 'manana', titulo: 'Cumplen mañana', estilo: 'border-amber-200 bg-amber-50 text-amber-900' },
  { clave: 'ayer', titulo: 'Cumplieron ayer', estilo: 'border-slate-200 bg-slate-50 text-slate-700' },
]

// Se muestra una vez por inicio de sesión (la marca se limpia al salir, ver Sidebar).
export function CumpleanosAlerta() {
  const [alerta, setAlerta] = useState<Alerta | null>(null)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLAVE_ALERTA_CUMPLEANOS)) return
      sessionStorage.setItem(CLAVE_ALERTA_CUMPLEANOS, '1')
    } catch {
      // Sin sessionStorage se muestra igualmente.
    }
    fetch('/api/cumpleanos/alerta')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Alerta | null) => {
        if (data && (data.ayer.length || data.hoy.length || data.manana.length)) setAlerta(data)
      })
      .catch(() => undefined)
  }, [])

  if (!alerta) return null

  return (
    <Modal title="Cumpleaños de pacientes" onClose={() => setAlerta(null)}>
      <div className="space-y-4">
        {SECCIONES.filter(({ clave }) => alerta[clave].length > 0).map(({ clave, titulo, estilo }) => (
          <div key={clave} className={`rounded-2xl border p-4 ${estilo}`}>
            <p className="text-sm font-semibold">{titulo}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {alerta[clave].map((cliente) => (
                <li key={cliente.clienteId} className="flex justify-between gap-3">
                  <span>{cliente.nombre}</span>
                  {cliente.celular && <span className="text-xs opacity-80">{cliente.celular}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button type="button" autoFocus onClick={() => setAlerta(null)} className="btn-brand">Entendido</button>
      </div>
    </Modal>
  )
}
