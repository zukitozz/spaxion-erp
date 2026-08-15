'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Cliente {
  id: string
  nombre: string
  dni: string | null
  ruc: string | null
  razonSocial: string | null
  celular: string | null
  distrito: string | null
  email: string | null
  fechaNacimiento: string | null
  peso: number | null
  notas: string | null
}

const emptyForm = {
  nombre: '', dni: '', ruc: '', razonSocial: '', celular: '', distrito: '',
  email: '', fechaNacimiento: '', peso: '', notas: '',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clientes')
      .then((res) => res.json())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
  }, [])

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    const response = await fetch('/api/clientes', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        id: editingId || undefined,
        peso: form.peso ? Number(form.peso) : undefined,
        fechaNacimiento: form.fechaNacimiento || undefined,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'No se pudo guardar el cliente')
      setLoading(false)
      return
    }

    setClientes((prev) => editingId ? prev.map((item) => item.id === editingId ? result : item) : [result, ...prev])
    setForm(emptyForm)
    setEditingId(null)
    setLoading(false)
  }

  const editCliente = (cliente: Cliente) => {
    setEditingId(cliente.id)
    setError('')
    setForm({
      nombre: cliente.nombre,
      dni: cliente.dni || '',
      ruc: cliente.ruc || '',
      razonSocial: cliente.razonSocial || '',
      celular: cliente.celular || '',
      distrito: cliente.distrito || '',
      email: cliente.email || '',
      fechaNacimiento: cliente.fechaNacimiento ? cliente.fechaNacimiento.slice(0, 10) : '',
      peso: cliente.peso?.toString() || '',
      notas: cliente.notas || '',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Clientes</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900">Registro y gestión</h1>
          <p className="mt-2 text-slate-600">Registra clientes y consulta su historial para check-in rápido.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-emerald-900">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="text-sm text-slate-500">Cancelar</button>}
            </div>
            {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="cliente-nombre" className="block text-sm font-medium text-slate-700">Nombre</label>
                <input id="cliente-nombre" value={form.nombre} onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))} className="field mt-2" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cliente-dni" className="block text-sm font-medium text-slate-700">DNI</label>
                  <input id="cliente-dni" value={form.dni} onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))} className="field mt-2" placeholder="Para boleta" />
                </div>
                <div>
                  <label htmlFor="cliente-ruc" className="block text-sm font-medium text-slate-700">RUC</label>
                  <input id="cliente-ruc" value={form.ruc} onChange={(event) => setForm((prev) => ({ ...prev, ruc: event.target.value }))} className="field mt-2" placeholder="Para factura" />
                </div>
              </div>

              <div>
                <label htmlFor="cliente-razon-social" className="block text-sm font-medium text-slate-700">Razón social</label>
                <input id="cliente-razon-social" value={form.razonSocial} onChange={(event) => setForm((prev) => ({ ...prev, razonSocial: event.target.value }))} className="field mt-2" placeholder="Requerido para emitir factura" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cliente-celular" className="block text-sm font-medium text-slate-700">Celular</label>
                  <input id="cliente-celular" value={form.celular} onChange={(event) => setForm((prev) => ({ ...prev, celular: event.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="cliente-distrito" className="block text-sm font-medium text-slate-700">Distrito</label>
                  <input id="cliente-distrito" value={form.distrito} onChange={(event) => setForm((prev) => ({ ...prev, distrito: event.target.value }))} className="field mt-2" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cliente-email" className="block text-sm font-medium text-slate-700">Email</label>
                  <input id="cliente-email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="cliente-fecha-nacimiento" className="block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                  <input id="cliente-fecha-nacimiento" type="date" value={form.fechaNacimiento} onChange={(event) => setForm((prev) => ({ ...prev, fechaNacimiento: event.target.value }))} className="field mt-2" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cliente-peso" className="block text-sm font-medium text-slate-700">Peso</label>
                  <input id="cliente-peso" type="number" value={form.peso} onChange={(event) => setForm((prev) => ({ ...prev, peso: event.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="cliente-notas" className="block text-sm font-medium text-slate-700">Notas</label>
                  <input id="cliente-notas" value={form.notas} onChange={(event) => setForm((prev) => ({ ...prev, notas: event.target.value }))} className="field mt-2" />
                </div>
              </div>

              <button type="button" disabled={loading || !form.nombre} onClick={() => void handleCreate()} className="btn-brand w-full disabled:opacity-60">
                {loading ? 'Guardando...' : editingId ? 'Actualizar cliente' : 'Crear cliente'}
              </button>
            </div>
          </div>

          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Clientes registrados</h2>
            <div className="mt-6 space-y-4">
              {clientes.map((cliente) => (
                <div key={cliente.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{cliente.nombre}</p>
                      <p className="text-sm text-slate-500">
                        {cliente.dni ? `DNI ${cliente.dni}` : cliente.ruc ? `RUC ${cliente.ruc}` : 'Sin documento'}
                        {cliente.distrito ? ` · ${cliente.distrito}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">Cliente</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Cel: {cliente.celular || '—'} · Email: {cliente.email || '—'}</p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={() => editCliente(cliente)} className="text-sm font-semibold text-emerald-700">Editar</button>
                    <button type="button" onClick={async () => { await fetch(`/api/clientes?id=${cliente.id}`, { method: 'DELETE' }); setClientes((prev) => prev.filter((item) => item.id !== cliente.id)) }} className="text-sm font-semibold text-rose-600">Eliminar</button>
                    <Link href={`/historico/atenciones?clienteId=${cliente.id}`} className="text-sm font-semibold text-slate-700">Ver historial</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
