'use client'

import { useEffect, useMemo, useState } from 'react'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'

interface Gasto {
  id: string
  concepto: string
  categoria: string | null
  monto: number
  fecha: string
  proveedor: string | null
  numeroComprobante: string | null
  notas: string | null
}

const PAGE_SIZE = 10

function normalizeGasto(value: Partial<Gasto>): Gasto {
  return {
    id: value.id || crypto.randomUUID(),
    concepto: value.concepto || 'Gasto sin concepto',
    categoria: value.categoria || null,
    monto: typeof value.monto === 'number' ? value.monto : Number(value.monto) || 0,
    fecha: value.fecha || new Date().toISOString(),
    proveedor: value.proveedor || null,
    numeroComprobante: value.numeroComprobante || null,
    notas: value.notas || null,
  }
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyForm = { concepto: '', categoria: '', monto: 0, fecha: hoyISO(), proveedor: '', numeroComprobante: '', notas: '' }

export default function GastosPage() {
  const toast = useToast()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const load = async () => {
    const res = await fetch('/api/gastos')
    const data = await res.json()
    setGastos(Array.isArray(data) ? data.map(normalizeGasto) : [])
    setCargando(false)
  }

  useEffect(() => { void load() }, [])

  const gastosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    if (!query) return gastos
    return gastos.filter((gasto) =>
      gasto.concepto.toLowerCase().includes(query) ||
      (gasto.categoria || '').toLowerCase().includes(query) ||
      (gasto.proveedor || '').toLowerCase().includes(query)
    )
  }, [gastos, busqueda])

  const totalMostrado = useMemo(() => gastosFiltrados.reduce((sum, g) => sum + g.monto, 0), [gastosFiltrados])

  const totalPages = Math.max(1, Math.ceil(gastosFiltrados.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, totalPages)
  const gastosPagina = gastosFiltrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)

  useEffect(() => { setPagina(1) }, [busqueda])

  const abrirNuevo = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMostrarFormulario(true)
  }

  const abrirEdicion = (gasto: Gasto) => {
    setEditingId(gasto.id)
    setForm({
      concepto: gasto.concepto,
      categoria: gasto.categoria || '',
      monto: gasto.monto,
      fecha: gasto.fecha.slice(0, 10),
      proveedor: gasto.proveedor || '',
      numeroComprobante: gasto.numeroComprobante || '',
      notas: gasto.notas || '',
    })
    setMostrarFormulario(true)
  }

  const handleGuardar = async () => {
    setLoading(true)
    const response = await fetch('/api/gastos', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
    })
    const result = await response.json()
    setLoading(false)
    if (!response.ok) {
      toast.error(result.error || 'No se pudo guardar el gasto')
      return
    }
    const guardado = normalizeGasto(result)
    setGastos((prev) => (editingId ? prev.map((item) => (item.id === editingId ? guardado : item)) : [guardado, ...prev]))
    setMostrarFormulario(false)
    toast.success(editingId ? 'Gasto actualizado' : 'Gasto registrado')
  }

  const handleEliminar = async (id: string) => {
    const response = await fetch(`/api/gastos?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      toast.error(data?.error || 'No se pudo eliminar el gasto')
      return
    }
    setGastos((prev) => prev.filter((item) => item.id !== id))
    toast.success('Gasto eliminado')
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Gastos</p>
          <h1 className="mt-3 page-heading text-3xl">Gastos y compras</h1>
          <p className="mt-2 text-slate-600">Solo para gerente: registra las facturas de compra y gastos del spa.</p>
        </div>

        <div className="card-surface">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-emerald-900">Listado</h2>
            <button type="button" onClick={abrirNuevo} className="rounded-full bg-[#00483f] px-5 py-2 text-sm font-bold text-white transition hover:brightness-110">+ Nuevo gasto</button>
          </div>

          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por concepto, categoría o proveedor..."
            className="field mt-4"
          />

          <p className="mt-4 text-sm text-slate-600">Total mostrado: <span className="font-semibold text-emerald-900">S/ {totalMostrado.toFixed(2)}</span></p>

          <div className="mt-6">
            {cargando ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando gastos...</p>
            ) : gastosPagina.length === 0 ? (
              <p className="text-sm text-slate-500">No se encontraron gastos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Fecha</th>
                      <th className="pb-3 pr-4">Concepto</th>
                      <th className="pb-3 pr-4">Categoría</th>
                      <th className="pb-3 pr-4">Proveedor</th>
                      <th className="pb-3 pr-4 text-right">Monto</th>
                      <th className="pb-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosPagina.map((gasto) => (
                      <tr key={gasto.id} className="border-t border-[#eef1ec]">
                        <td className="py-3 pr-4 text-slate-600">{new Date(gasto.fecha).toLocaleDateString('es-PE')}</td>
                        <td className="py-3 pr-4 font-semibold text-[#173d36]">{gasto.concepto}</td>
                        <td className="py-3 pr-4 text-slate-600">{gasto.categoria || '—'}</td>
                        <td className="py-3 pr-4 text-slate-600">{gasto.proveedor || '—'}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">S/ {gasto.monto.toFixed(2)}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <button type="button" onClick={() => abrirEdicion(gasto)} className="text-sm font-semibold text-emerald-700">Editar</button>
                            <button type="button" onClick={() => void handleEliminar(gasto.id)} className="text-sm font-semibold text-rose-600">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Pagination page={paginaActual} totalPages={totalPages} onChange={setPagina} />
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="card-surface w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-emerald-900">{editingId ? 'Editar gasto' : 'Nuevo gasto'}</h2>
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Cerrar"
              >✕</button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Concepto</label>
              <input
                type="text"
                value={form.concepto}
                onChange={(event) => setForm((prev) => ({ ...prev, concepto: event.target.value }))}
                className="field"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Categoría (opcional)</label>
                  <input
                    type="text"
                    value={form.categoria}
                    onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))}
                    className="field mt-2"
                    placeholder="Ej: Insumos, Servicios, Alquiler..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Monto</label>
                  <input
                    type="number"
                    value={form.monto}
                    onChange={(event) => setForm((prev) => ({ ...prev, monto: Number(event.target.value) }))}
                    className="field mt-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                    className="field mt-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Proveedor (opcional)</label>
                  <input
                    type="text"
                    value={form.proveedor}
                    onChange={(event) => setForm((prev) => ({ ...prev, proveedor: event.target.value }))}
                    className="field mt-2"
                  />
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">N° de comprobante (opcional)</label>
              <input
                value={form.numeroComprobante}
                onChange={(event) => setForm((prev) => ({ ...prev, numeroComprobante: event.target.value }))}
                className="field"
              />

              <label className="block text-sm font-medium text-slate-700">Notas (opcional)</label>
              <textarea
                value={form.notas}
                onChange={(event) => setForm((prev) => ({ ...prev, notas: event.target.value }))}
                className="field min-h-20"
              />

              <button
                type="button"
                disabled={loading || !form.concepto || !form.fecha}
                onClick={() => void handleGuardar()}
                className="btn-brand flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Spinner />}
                {loading ? 'Guardando...' : editingId ? 'Actualizar gasto' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
