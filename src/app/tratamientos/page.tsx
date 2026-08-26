'use client'

import { useEffect, useState } from 'react'

interface Producto {
  id: string
  nombre: string
  stock: number
}

interface Insumo {
  productoId: string
  cantidad: number
  unidad: string
}

interface Tratamiento {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  duracionMin: number
  activo: boolean
  diasProximoTratamiento: number | null
  insumos: { id: string; cantidad: number; unidad: string; producto: Producto }[]
}

const emptyForm = { nombre: '', descripcion: '', precio: 0, duracionMin: 30, diasProximoTratamiento: '', insumos: [] as Insumo[] }

export default function TratamientosPage() {
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const [tratamientosResponse, productosResponse] = await Promise.all([fetch('/api/tratamientos'), fetch('/api/productos')])
    const [tratamientosData, productosData] = await Promise.all([tratamientosResponse.json(), productosResponse.json()])
    setTratamientos(Array.isArray(tratamientosData) ? tratamientosData : [])
    setProductos(Array.isArray(productosData) ? productosData : [])
  }

  useEffect(() => { void load() }, [])

  const addInsumo = () => {
    const available = productos.find((producto) => !form.insumos.some((item) => item.productoId === producto.id))
    if (!available) return
    setForm((current) => ({ ...current, insumos: [...current.insumos, { productoId: available.id, cantidad: 1, unidad: 'unidad' }] }))
  }

  const updateInsumo = (index: number, changes: Partial<Insumo>) => {
    setForm((current) => ({ ...current, insumos: current.insumos.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }))
  }

  const removeInsumo = (index: number) => setForm((current) => ({ ...current, insumos: current.insumos.filter((_, itemIndex) => itemIndex !== index) }))

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')
    const response = await fetch('/api/tratamientos', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
    })
    const result = await response.json()
    if (!response.ok) {
      setMessage(result.error || 'No se pudo guardar el tratamiento')
      setLoading(false)
      return
    }
    setForm(emptyForm)
    setEditingId(null)
    setMessage('Tratamiento guardado correctamente.')
    await load()
    setLoading(false)
  }

  const editTreatment = (tratamiento: Tratamiento) => {
    setEditingId(tratamiento.id)
    setForm({
      nombre: tratamiento.nombre,
      descripcion: tratamiento.descripcion || '',
      precio: tratamiento.precio,
      duracionMin: tratamiento.duracionMin,
      diasProximoTratamiento: tratamiento.diasProximoTratamiento ? String(tratamiento.diasProximoTratamiento) : '',
      insumos: tratamiento.insumos.map((item) => ({ productoId: item.producto.id, cantidad: item.cantidad, unidad: item.unidad })),
    })
  }

  const deleteTreatment = async (id: string) => {
    await fetch(`/api/tratamientos?id=${id}`, { method: 'DELETE' })
    setTratamientos((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Tratamientos</p>
          <h1 className="mt-3 page-heading text-3xl">Tratamientos e insumos</h1>
          <p className="mt-2 text-slate-600">Define qué productos consume cada servicio para mantener el inventario controlado.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card-surface space-y-4">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-emerald-900">{editingId ? 'Editar tratamiento' : 'Nuevo tratamiento'}</h2>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} className="text-sm text-slate-500">Cancelar</button>}</div>
            <label htmlFor="tratamiento-nombre" className="block text-sm font-medium text-slate-700">Nombre</label>
            <input id="tratamiento-nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className="field" />
            <label htmlFor="tratamiento-descripcion" className="block text-sm font-medium text-slate-700">Descripción</label>
            <textarea id="tratamiento-descripcion" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="field min-h-24" />
            <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="tratamiento-precio" className="block text-sm font-medium text-slate-700">Precio</label><input id="tratamiento-precio" type="number" value={form.precio} onChange={(event) => setForm({ ...form, precio: Number(event.target.value) })} className="field mt-2" /></div><div><label htmlFor="tratamiento-duracion" className="block text-sm font-medium text-slate-700">Duración (min)</label><input id="tratamiento-duracion" type="number" value={form.duracionMin} onChange={(event) => setForm({ ...form, duracionMin: Number(event.target.value) })} className="field mt-2" /></div></div>
            <div>
              <label htmlFor="tratamiento-dias" className="block text-sm font-medium text-slate-700">Días sugeridos para el próximo tratamiento <span className="text-rose-600">*</span></label>
              <input id="tratamiento-dias" type="number" min={1} required value={form.diasProximoTratamiento} onChange={(event) => setForm({ ...form, diasProximoTratamiento: event.target.value })} className="field mt-2" placeholder="Ej. 30" />
              <p className="mt-1 text-xs text-slate-500">Obligatorio. Se usa para calcular la fecha sugerida en Seguimiento de clientes y se propone al finalizar una atención con este tratamiento.</p>
            </div>

            <div className="border-t border-slate-200 pt-5"><div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold text-emerald-900">Productos consumidos</h3><p className="mt-1 text-xs text-slate-500">Ejemplo: algodón 2 unidades, alcohol 10 ml.</p></div><button type="button" onClick={addInsumo} className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">+ Agregar</button></div><div className="mt-4 space-y-3">{form.insumos.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Este tratamiento no tiene insumos asignados.</p>}{form.insumos.map((insumo, index) => <div key={`${insumo.productoId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_0.6fr_0.7fr_auto]"><select aria-label="Producto del insumo" value={insumo.productoId} onChange={(event) => updateInsumo(index, { productoId: event.target.value })} className="field"><option value="">Selecciona producto</option>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} · stock {producto.stock}</option>)}</select><input aria-label="Cantidad del insumo" type="number" min="0.01" step="0.01" value={insumo.cantidad} onChange={(event) => updateInsumo(index, { cantidad: Number(event.target.value) })} className="field"/><input aria-label="Unidad del insumo" value={insumo.unidad} onChange={(event) => updateInsumo(index, { unidad: event.target.value })} className="field" placeholder="unidad"/><button type="button" onClick={() => removeInsumo(index)} className="px-2 text-sm text-rose-600">Quitar</button></div>)}</div></div>

            <button type="button" disabled={loading || !form.nombre || Number(form.diasProximoTratamiento) <= 0} onClick={() => void handleSubmit()} className="btn-brand w-full disabled:opacity-60">{loading ? 'Guardando...' : editingId ? 'Actualizar tratamiento' : 'Crear tratamiento'}</button>
            {message && <p className="text-sm text-slate-600">{message}</p>}
          </div>

          <div className="card-surface"><h2 className="text-xl font-semibold text-emerald-900">Listado</h2><div className="mt-6 space-y-4">{tratamientos.map((tratamiento) => <div key={tratamiento.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-lg font-semibold text-slate-900">{tratamiento.nombre}</p><p className="mt-1 text-sm text-slate-500">S/ {tratamiento.precio.toFixed(2)} · {tratamiento.duracionMin} min · {tratamiento.diasProximoTratamiento ? `próximo en ${tratamiento.diasProximoTratamiento} días` : 'sin días sugeridos'}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">{tratamiento.activo ? 'Activo' : 'Inactivo'}</span></div><p className="mt-3 text-sm text-slate-600">{tratamiento.descripcion || 'Sin descripción'}</p><div className="mt-4 flex flex-wrap gap-2">{tratamiento.insumos.map((insumo) => <span key={insumo.id} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">{insumo.producto.nombre} · {insumo.cantidad} {insumo.unidad}</span>)}</div><div className="mt-4 flex gap-3"><button type="button" onClick={() => editTreatment(tratamiento)} className="text-sm font-semibold text-emerald-700">Editar</button><button type="button" onClick={() => void deleteTreatment(tratamiento.id)} className="text-sm font-semibold text-rose-600">Eliminar</button></div></div>)}</div></div>
        </div>
      </div>
    </div>
  )
}
