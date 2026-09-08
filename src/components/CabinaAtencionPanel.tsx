'use client'

import { useState } from 'react'
import type { AtencionActual, CabinaEstado } from '@/components/CabinaCard'
import { AtencionEnCursoPanel } from '@/components/AtencionEnCursoPanel'
import { useToast } from '@/components/Toast'

interface CabinaDetalle {
  id: string
  nombre: string
  estado: CabinaEstado
  atencionActual: AtencionActual | null
}

interface CabinaAtencionPanelProps {
  cabina: CabinaDetalle
  onClose: () => void
  onChanged: () => void
}

const ESTADOS_MANUALES: CabinaEstado[] = ['DISPONIBLE', 'LIMPIEZA', 'MANTENIMIENTO']

// Panel legado: solo se usa cuando la empresa tiene activado "usar cabinas físicas".
// Delega el manejo de tratamientos al mismo panel que usan Dashboard/Bandeja.
export function CabinaAtencionPanel({ cabina, onClose, onChanged }: CabinaAtencionPanelProps) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cambiarEstadoManual = async (estado: CabinaEstado) => {
    setSaving(true)
    setError('')
    const response = await fetch(`/api/cabinas/${cabina.id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    setSaving(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo cambiar el estado')
      return
    }
    toast.success('Estado de cabina actualizado')
    onChanged()
  }

  if (cabina.estado === 'ATENCION' && cabina.atencionActual) {
    return <AtencionEnCursoPanel atencion={cabina.atencionActual} onClose={onClose} onChanged={onChanged} />
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}

      {cabina.estado === 'DISPONIBLE' && (
        <AtencionEnCursoPanel atencion={null} cabinaId={cabina.id} onClose={onClose} onChanged={onChanged} />
      )}

      <div className={cabina.estado === 'DISPONIBLE' ? 'border-t border-slate-200 pt-5' : ''}>
        <label className="block text-sm font-medium text-slate-700">Cambiar estado manualmente</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ESTADOS_MANUALES.filter((estado) => estado !== cabina.estado).map((estado) => (
            <button
              key={estado}
              type="button"
              disabled={saving}
              onClick={() => void cambiarEstadoManual(estado)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {estado === 'DISPONIBLE' ? 'Disponible' : estado === 'LIMPIEZA' ? 'Limpieza' : 'Mantenimiento'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
