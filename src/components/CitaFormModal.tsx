'use client'

import { useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'

interface Cliente {
  id: string
  nombre: string
}

interface Tratamiento {
  id: string
  nombre: string
  activo: boolean
  duracionMin: number
}

export interface Cita {
  id: string
  fecha: string
  tratamiento: string
  duracionMin: number | null
  descripcion: string | null
  estado: string
  origen: string
  cliente: Cliente | null
}

interface CitaFormModalProps {
  modo: 'crear' | 'editar'
  cita?: Cita
  fechaInicial?: string
  clientes: Cliente[]
  tratamientos: Tratamiento[]
  onClose: () => void
  onGuardado: (cita: Cita) => void
  onEliminado: (citaId: string) => void
}

function toDateInput(iso: string) {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toHoraInput(iso: string) {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const hoyKey = toDateInput(new Date().toISOString())

const HORAS_OPCIONES = Array.from({ length: 96 }, (_, i) => {
  const totalMin = i * 15
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(totalMin / 60))}:${pad(totalMin % 60)}`
})

export function CitaFormModal({ modo, cita, fechaInicial, clientes, tratamientos, onClose, onGuardado, onEliminado }: CitaFormModalProps) {
  const [clienteId, setClienteId] = useState(cita?.cliente?.id || '')
  const [clienteQuery, setClienteQuery] = useState(cita?.cliente?.nombre || '')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [fecha, setFecha] = useState(cita ? toDateInput(cita.fecha) : fechaInicial || '')
  const [hora, setHora] = useState(cita ? toHoraInput(cita.fecha) : '09:00')
  const [tratamiento, setTratamiento] = useState(cita?.tratamiento || '')
  const [duracionMin, setDuracionMin] = useState(cita?.duracionMin ? String(cita.duracionMin) : '')
  const [showTratamientoDropdown, setShowTratamientoDropdown] = useState(false)
  const [estado, setEstado] = useState(cita?.estado || 'PENDIENTE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const clientesFiltrados = useMemo(() => {
    const query = clienteQuery.trim().toLowerCase()
    if (!query) return clientes.slice(0, 8)
    return clientes.filter((c) => c.nombre.toLowerCase().includes(query)).slice(0, 8)
  }, [clientes, clienteQuery])

  const tratamientosFiltrados = useMemo(() => {
    const query = tratamiento.trim().toLowerCase()
    if (!query) return tratamientos.filter((t) => t.activo).slice(0, 8)
    return tratamientos.filter((t) => t.activo && t.nombre.toLowerCase().includes(query)).slice(0, 8)
  }, [tratamientos, tratamiento])

  const elegirTratamiento = (t: Tratamiento) => {
    setTratamiento(t.nombre)
    setDuracionMin(t.duracionMin ? String(t.duracionMin) : '')
    setShowTratamientoDropdown(false)
  }

  const fechaPasada = modo === 'crear' && Boolean(fecha) && fecha < hoyKey
  const puedeGuardar = (modo === 'crear' ? Boolean(clienteId && fecha && hora && tratamiento) : Boolean(fecha && hora && tratamiento)) && !fechaPasada

  const guardar = async () => {
    setSaving(true)
    setError('')
    const fechaHora = `${fecha}T${hora}`
    const response = await fetch('/api/citas', {
      method: modo === 'crear' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        modo === 'crear'
          ? { clienteId, fecha: fechaHora, tratamiento, duracionMin: duracionMin || null, estado }
          : { id: cita!.id, clienteId: clienteId || undefined, fecha: fechaHora, tratamiento, duracionMin: duracionMin || null, estado }
      ),
    })
    setSaving(false)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error || 'No se pudo guardar la cita')
      return
    }
    const guardada = await response.json()
    onGuardado(guardada)
    onClose()
  }

  const eliminar = async () => {
    if (!cita) return
    if (!window.confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.')) return
    setSaving(true)
    setError('')
    const response = await fetch(`/api/citas?id=${cita.id}`, { method: 'DELETE' })
    setSaving(false)
    if (!response.ok) {
      setError('No se pudo eliminar la cita')
      return
    }
    onEliminado(cita.id)
    onClose()
  }

  return (
    <Modal title={modo === 'crear' ? 'Nueva cita' : 'Editar cita'} onClose={onClose}>
      <div className="space-y-4">
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}

        {cita?.origen === 'GOOGLE' && cita.descripcion && (
          <div className="rounded-2xl border border-[#e8f0fe] bg-[#f4f8ff] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#1a53a1]">Contenido original de Google Calendar</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{cita.descripcion}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">Cliente{modo === 'editar' && ' (opcional)'}</label>
          <div className="relative">
            <input
              value={clienteQuery}
              onChange={(event) => {
                setClienteQuery(event.target.value)
                setClienteId('')
                setShowClienteDropdown(true)
              }}
              onFocus={() => setShowClienteDropdown(true)}
              onBlur={() => setTimeout(() => setShowClienteDropdown(false), 150)}
              autoComplete="off"
              placeholder="Busca un cliente por nombre"
              className="field mt-2"
            />
            {showClienteDropdown && clientesFiltrados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[#dfe8e0] bg-white shadow-lg">
                {clientesFiltrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => {
                      setClienteId(c.id)
                      setClienteQuery(c.nombre)
                      setShowClienteDropdown(false)
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#ecf8f2]"
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cita-fecha" className="block text-sm font-medium text-slate-700">Fecha</label>
            <input
              id="cita-fecha"
              type="date"
              value={fecha}
              min={modo === 'crear' ? hoyKey : undefined}
              onChange={(event) => setFecha(event.target.value)}
              className="field mt-2"
            />
          </div>
          <div>
            <label htmlFor="cita-hora" className="block text-sm font-medium text-slate-700">Hora</label>
            <select id="cita-hora" value={hora} onChange={(event) => setHora(event.target.value)} className="field mt-2">
              {HORAS_OPCIONES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          {fechaPasada && <p className="col-span-2 -mt-1 text-xs font-semibold text-rose-600">No se pueden crear citas en fechas anteriores a hoy.</p>}
        </div>

        <div>
          <label htmlFor="cita-tratamiento" className="block text-sm font-medium text-slate-700">Tratamiento</label>
          <div className="relative">
            <input
              id="cita-tratamiento"
              value={tratamiento}
              onChange={(event) => { setTratamiento(event.target.value); setShowTratamientoDropdown(true) }}
              onFocus={() => setShowTratamientoDropdown(true)}
              onBlur={() => setTimeout(() => setShowTratamientoDropdown(false), 150)}
              autoComplete="off"
              placeholder="Escribe o elige un tratamiento"
              className="field mt-2"
            />
            {showTratamientoDropdown && tratamientosFiltrados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[#dfe8e0] bg-white shadow-lg">
                {tratamientosFiltrados.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={() => elegirTratamiento(t)}
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#ecf8f2]"
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="cita-duracion" className="block text-sm font-medium text-slate-700">Duración (minutos, opcional)</label>
          <input
            id="cita-duracion"
            type="number"
            min={5}
            step={5}
            value={duracionMin}
            onChange={(event) => setDuracionMin(event.target.value)}
            placeholder="60"
            className="field mt-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Estado</label>
          <select value={estado} onChange={(event) => setEstado(event.target.value)} className="field mt-2">
            <option value="PENDIENTE">Pendiente</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="ATENDIDA">Atendida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" disabled={saving || !puedeGuardar} onClick={() => void guardar()} className="btn-brand flex-1 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {modo === 'editar' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void eliminar()}
              className="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
