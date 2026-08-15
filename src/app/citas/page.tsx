'use client'

import { useEffect, useState } from 'react'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

interface Cliente {
  id: string
  nombre: string
}

interface Cita {
  id: string
  fecha: string
  tratamiento: string
  estado: string
  cliente: Cliente
}

export default function CitasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [form, setForm] = useState({ clienteId: '', fecha: '', tratamiento: '', estado: 'PENDIENTE' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([fetch('/api/clientes').then((res) => res.json()), fetch('/api/citas').then((res) => res.json())])
      .then(([clientesData, citasData]) => {
        setClientes(Array.isArray(clientesData) ? clientesData : [])
        setCitas(Array.isArray(citasData) ? citasData : [])
      })
  }, [])

  const handleCreate = async () => {
    setLoading(true)
    const response = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const created = await response.json()
    setCitas((prev) => [created, ...prev])
    setForm({ clienteId: '', fecha: '', tratamiento: '', estado: 'PENDIENTE' })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Citas</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900">Agenda y check-in</h1>
          <p className="mt-2 text-slate-600">Administra las citas del día y asigna tratamiento al cliente.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Nueva cita</h2>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Cliente</label>
              <select
                value={form.clienteId}
                onChange={(event) => setForm((prev) => ({ ...prev, clienteId: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Selecciona cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                ))}
              </select>

              <label className="block text-sm font-medium text-slate-700">Fecha y hora</label>
              <input
                type="datetime-local"
                value={form.fecha}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <label className="block text-sm font-medium text-slate-700">Tratamiento</label>
              <input
                value={form.tratamiento}
                onChange={(event) => setForm((prev) => ({ ...prev, tratamiento: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <label className="block text-sm font-medium text-slate-700">Estado</label>
              <select
                value={form.estado}
                onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="ATENDIDA">Atendida</option>
                <option value="CANCELADA">Cancelada</option>
              </select>

              <button
                type="button"
                disabled={loading}
                onClick={handleCreate}
                className="btn-brand w-full disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Crear cita'}
              </button>
            </div>
          </div>

          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Citas próximas</h2>
            <div className="mt-6 space-y-4">
              {citas.map((cita) => (
                <div key={cita.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-lg font-semibold text-slate-900">{new Date(cita.fecha).toLocaleString('es-PE')}</p>
                  <p className="text-sm text-slate-500">
                    <ClienteHistorialLink clienteId={cita.cliente.id} nombre={cita.cliente.nombre} /> · {cita.tratamiento}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">{cita.estado}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
