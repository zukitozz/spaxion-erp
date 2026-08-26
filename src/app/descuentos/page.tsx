'use client'

import { useEffect, useMemo, useState } from 'react'

type DescuentoTipo = 'PORCENTAJE' | 'FIJO'

interface Descuento {
  id: string
  codigo: string
  descripcion: string | null
  tipo: DescuentoTipo
  valor: number
  activo: boolean
  fechaInicio: string | null
  fechaFin: string | null
}

const initialForm = {
  codigo: '',
  descripcion: '',
  tipo: 'PORCENTAJE' as DescuentoTipo,
  valor: 0,
  fechaInicio: '',
  fechaFin: '',
  activo: true,
}

export default function DescuentosPage() {
  const [descuentos, setDescuentos] = useState<Descuento[]>([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)

  const fetchDescuentos = async () => {
    const response = await fetch('/api/descuentos')
    const data = await response.json()
    setDescuentos(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    void fetchDescuentos()
  }, [])

  const handleCreate = async () => {
    setLoading(true)
    await fetch('/api/descuentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm(initialForm)
    await fetchDescuentos()
    setLoading(false)
  }

  const handleToggleActive = async (descuento: Descuento) => {
    await fetch('/api/descuentos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: descuento.id, activo: !descuento.activo }),
    })
    await fetchDescuentos()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/descuentos?id=${id}`, {
      method: 'DELETE',
    })
    await fetchDescuentos()
  }

  const activeCount = useMemo(() => descuentos.filter((item) => item.activo).length, [descuentos])

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Descuentos</p>
          <h1 className="mt-3 page-heading text-3xl">Campañas y promociones</h1>
          <p className="mt-2 text-slate-600">Crea códigos de descuento para tratamientos, productos y facturación.</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Nuevo descuento</h2>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Código</label>
                <input
                  value={form.codigo}
                  onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value.toUpperCase() }))}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                <input
                  value={form.descripcion}
                  onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value as DescuentoTipo }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="PORCENTAJE">Porcentaje</option>
                    <option value="FIJO">Monto fijo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Valor</label>
                  <input
                    type="number"
                    value={form.valor}
                    onChange={(event) => setForm((prev) => ({ ...prev, valor: Number(event.target.value) }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Inicio</label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={(event) => setForm((prev) => ({ ...prev, fechaInicio: event.target.value }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Fin</label>
                  <input
                    type="date"
                    value={form.fechaFin}
                    onChange={(event) => setForm((prev) => ({ ...prev, fechaFin: event.target.value }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={loading || !form.codigo}
                onClick={handleCreate}
                className="btn-brand w-full disabled:opacity-60"
              >
                {loading ? 'Guardando...' : 'Crear descuento'}
              </button>
            </div>
          </div>

          <div className="card-surface">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Resumen rápido</p>
                <p className="mt-2 page-heading text-3xl">{activeCount} activos</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {descuentos.map((descuento) => (
                <div key={descuento.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{descuento.codigo}</p>
                      <p className="mt-1 text-sm text-slate-500">{descuento.descripcion || 'Sin descripción'}</p>
                      <p className="mt-2 text-sm text-slate-600">{descuento.tipo === 'PORCENTAJE' ? `%${descuento.valor}` : `S/ ${descuento.valor.toFixed(2)}`}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(descuento)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        {descuento.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(descuento.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                    Vigencia: {descuento.fechaInicio || 'Siempre'} → {descuento.fechaFin || 'Siempre'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
