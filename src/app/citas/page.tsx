'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

interface Cliente {
  id: string
  nombre: string
}

interface Tratamiento {
  id: string
  nombre: string
  activo: boolean
}

interface Cita {
  id: string
  fecha: string
  tratamiento: string
  estado: string
  cliente: Cliente
}

const badgeStyles: Record<string, { bg: string; color: string }> = {
  PENDIENTE: { bg: '#fdf3e0', color: '#92620c' },
  CONFIRMADA: { bg: '#ecf8f2', color: '#1d6f50' },
  ATENDIDA: { bg: '#f1f5f9', color: '#334155' },
  CANCELADA: { bg: '#fdeceb', color: '#b3403a' },
  EXPIRADA: { bg: '#f1f5f9', color: '#64748b' },
}

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function buildWeek() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay() + 1)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export default function CitasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [form, setForm] = useState({ clienteId: '', fecha: '', tratamiento: '', estado: 'PENDIENTE' })
  const [clienteQuery, setClienteQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(() => new Date().toISOString().slice(0, 10))
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [showTratamientoDropdown, setShowTratamientoDropdown] = useState(false)
  const semana = useMemo(() => buildWeek(), [])

  const citasVisibles = diaSeleccionado
    ? citas.filter((cita) => cita.fecha.slice(0, 10) === diaSeleccionado)
    : citas

  const clientesFiltrados = useMemo(() => {
    const query = clienteQuery.trim().toLowerCase()
    if (!query) return clientes.slice(0, 8)
    return clientes.filter((cliente) => cliente.nombre.toLowerCase().includes(query)).slice(0, 8)
  }, [clientes, clienteQuery])

  const tratamientosFiltrados = useMemo(() => {
    const query = form.tratamiento.trim().toLowerCase()
    if (!query) return tratamientos.filter((tratamiento) => tratamiento.activo).slice(0, 8)
    return tratamientos
      .filter((tratamiento) => tratamiento.activo && tratamiento.nombre.toLowerCase().includes(query))
      .slice(0, 8)
  }, [tratamientos, form.tratamiento])

  useEffect(() => {
    Promise.all([
      fetch('/api/clientes').then((res) => res.json()),
      fetch('/api/citas').then((res) => res.json()),
      fetch('/api/tratamientos').then((res) => res.json()),
    ])
      .then(([clientesData, citasData, tratamientosData]) => {
        setClientes(Array.isArray(clientesData) ? clientesData : [])
        setCitas(Array.isArray(citasData) ? citasData : [])
        setTratamientos(Array.isArray(tratamientosData) ? tratamientosData : [])
      })
  }, [])

  const handleCreate = async () => {
    // TODO: sincronizar con Google Calendar al crear la cita.
    // Ya existe el endpoint POST /api/integraciones/google-calendar (requiere
    // GOOGLE_CALENDAR_ACCESS_TOKEN vía OAuth) pero no se invoca desde aquí.
    setLoading(true)
    const response = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const created = await response.json()
    setCitas((prev) => [created, ...prev])
    setForm({ clienteId: '', fecha: '', tratamiento: '', estado: 'PENDIENTE' })
    setClienteQuery('')
    setLoading(false)
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Citas</p>
          <h1 className="page-heading mt-3 text-3xl">Agenda y check-in</h1>
          <p className="mt-2 text-slate-600">Administra las citas del día y asigna tratamiento al cliente.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {semana.map((date) => {
            const key = date.toISOString().slice(0, 10)
            const activo = diaSeleccionado === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDiaSeleccionado(activo ? null : key)}
                className={`w-[72px] shrink-0 rounded-2xl py-3 text-center transition ${
                  activo ? 'bg-gradient-to-br from-[#00483f] to-[#00665b] text-[#fffdf7]' : 'bg-white text-[#334155] hover:bg-[#f1f5f4]'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{diasSemana[date.getDay()]}</p>
                <p className="page-heading mt-1 text-lg">{date.getDate()}</p>
              </button>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface">
            <h2 className="text-xl font-bold text-[#173d36]">Nueva cita</h2>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Cliente</label>
              <div className="relative">
                <input
                  value={clienteQuery}
                  onChange={(event) => {
                    setClienteQuery(event.target.value)
                    setForm((prev) => ({ ...prev, clienteId: '' }))
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
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onMouseDown={() => {
                          setForm((prev) => ({ ...prev, clienteId: cliente.id }))
                          setClienteQuery(cliente.nombre)
                          setShowClienteDropdown(false)
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#ecf8f2]"
                      >
                        {cliente.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="block text-sm font-medium text-slate-700">Fecha y hora</label>
              <input
                type="datetime-local"
                value={form.fecha}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                className="field mt-2"
              />

              <label className="block text-sm font-medium text-slate-700">Tratamiento</label>
              <div className="relative">
                <input
                  value={form.tratamiento}
                  onChange={(event) => { setForm((prev) => ({ ...prev, tratamiento: event.target.value })); setShowTratamientoDropdown(true) }}
                  onFocus={() => setShowTratamientoDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTratamientoDropdown(false), 150)}
                  autoComplete="off"
                  placeholder="Escribe o elige un tratamiento"
                  className="field mt-2"
                />
                {showTratamientoDropdown && tratamientosFiltrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[#dfe8e0] bg-white shadow-lg">
                    {tratamientosFiltrados.map((tratamiento) => (
                      <button
                        key={tratamiento.id}
                        type="button"
                        onMouseDown={() => { setForm((prev) => ({ ...prev, tratamiento: tratamiento.nombre })); setShowTratamientoDropdown(false) }}
                        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#ecf8f2]"
                      >
                        {tratamiento.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="block text-sm font-medium text-slate-700">Estado</label>
              <select
                value={form.estado}
                onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value }))}
                className="field mt-2"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="ATENDIDA">Atendida</option>
                <option value="CANCELADA">Cancelada</option>
              </select>

              <button
                type="button"
                disabled={loading || !form.clienteId || !form.fecha}
                onClick={handleCreate}
                className="btn-brand w-full disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Crear cita'}
              </button>
            </div>
          </div>

          <div className="card-surface">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#173d36]">Citas próximas</h2>
              {diaSeleccionado && (
                <button type="button" onClick={() => setDiaSeleccionado(null)} className="text-xs font-bold text-[#9a7e62]">Ver todas</button>
              )}
            </div>
            <div className="mt-6 space-y-3">
              {citasVisibles.length === 0 && <p className="text-sm text-slate-500">No hay citas para este día.</p>}
              {citasVisibles.map((cita) => {
                const badge = badgeStyles[cita.estado] ?? badgeStyles.PENDIENTE
                return (
                  <div key={cita.id} className="flex items-center gap-4 rounded-2xl border border-[#eef1ec] bg-[#fdfdfb] p-4">
                    <div className="w-16 shrink-0">
                      <p className="page-heading text-[15px]">{new Date(cita.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{new Date(cita.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#173d36]"><ClienteHistorialLink clienteId={cita.cliente.id} nombre={cita.cliente.nombre} /></p>
                      <p className="mt-0.5 text-[12.5px] text-slate-600">{cita.tratamiento}</p>
                    </div>
                    <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold" style={{ background: badge.bg, color: badge.color }}>{cita.estado}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
