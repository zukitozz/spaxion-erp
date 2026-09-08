'use client'

import { useEffect, useMemo, useState } from 'react'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'

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

const PAGE_SIZE = 10

const emptyForm = { nombre: '', descripcion: '', precio: 0, duracionMin: 30, diasProximoTratamiento: '', insumos: [] as Insumo[] }

export default function TratamientosPage() {
  const toast = useToast()
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const load = async () => {
    const [tratamientosResponse, productosResponse] = await Promise.all([fetch('/api/tratamientos'), fetch('/api/productos')])
    const [tratamientosData, productosData] = await Promise.all([tratamientosResponse.json(), productosResponse.json()])
    setTratamientos(Array.isArray(tratamientosData) ? tratamientosData : [])
    setProductos(Array.isArray(productosData) ? productosData : [])
    setCargando(false)
  }

  useEffect(() => { void load() }, [])

  const tratamientosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    if (!query) return tratamientos
    return tratamientos.filter((tratamiento) => tratamiento.nombre.toLowerCase().includes(query))
  }, [tratamientos, busqueda])

  const totalPages = Math.max(1, Math.ceil(tratamientosFiltrados.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, totalPages)
  const tratamientosPagina = tratamientosFiltrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)

  useEffect(() => { setPagina(1) }, [busqueda])

  const addInsumo = () => {
    const available = productos.find((producto) => !form.insumos.some((item) => item.productoId === producto.id))
    if (!available) return
    setForm((current) => ({ ...current, insumos: [...current.insumos, { productoId: available.id, cantidad: 1, unidad: 'unidad' }] }))
  }

  const updateInsumo = (index: number, changes: Partial<Insumo>) => {
    setForm((current) => ({ ...current, insumos: current.insumos.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)) }))
  }

  const removeInsumo = (index: number) => setForm((current) => ({ ...current, insumos: current.insumos.filter((_, itemIndex) => itemIndex !== index) }))

  const abrirNuevo = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMostrarFormulario(true)
  }

  const abrirEdicion = (tratamiento: Tratamiento) => {
    setEditingId(tratamiento.id)
    setForm({
      nombre: tratamiento.nombre,
      descripcion: tratamiento.descripcion || '',
      precio: tratamiento.precio,
      duracionMin: tratamiento.duracionMin,
      diasProximoTratamiento: tratamiento.diasProximoTratamiento ? String(tratamiento.diasProximoTratamiento) : '',
      insumos: tratamiento.insumos.map((item) => ({ productoId: item.producto.id, cantidad: item.cantidad, unidad: item.unidad })),
    })
    setMostrarFormulario(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const response = await fetch('/api/tratamientos', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
    })
    const result = await response.json()
    setLoading(false)
    if (!response.ok) {
      toast.error(result.error || 'No se pudo guardar el tratamiento')
      return
    }
    setMostrarFormulario(false)
    toast.success(editingId ? 'Tratamiento actualizado' : 'Tratamiento creado')
    await load()
  }

  const deleteTreatment = async (id: string) => {
    const response = await fetch(`/api/tratamientos?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      toast.error(data?.error || 'No se pudo eliminar el tratamiento')
      return
    }
    setTratamientos((current) => current.filter((item) => item.id !== id))
    toast.success('Tratamiento eliminado')
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Tratamientos</p>
          <h1 className="mt-3 page-heading text-3xl">Tratamientos e insumos</h1>
          <p className="mt-2 text-slate-600">Define qué productos consume cada servicio para mantener el inventario controlado.</p>
        </div>

        <div className="card-surface">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-emerald-900">Listado</h2>
            <button type="button" onClick={abrirNuevo} className="rounded-full bg-[#00483f] px-5 py-2 text-sm font-bold text-white transition hover:brightness-110">+ Nuevo tratamiento</button>
          </div>

          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre..."
            className="field mt-4"
          />

          <div className="mt-6">
            {cargando ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando tratamientos...</p>
            ) : tratamientosPagina.length === 0 ? (
              <p className="text-sm text-slate-500">No se encontraron tratamientos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Nombre</th>
                      <th className="pb-3 pr-4 text-right">Precio</th>
                      <th className="pb-3 pr-4 text-right">Duración</th>
                      <th className="pb-3 pr-4">Próximo tratamiento</th>
                      <th className="pb-3 pr-4">Estado</th>
                      <th className="pb-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tratamientosPagina.map((tratamiento) => (
                      <tr key={tratamiento.id} className="border-t border-[#eef1ec]">
                        <td className="py-3 pr-4 font-semibold text-[#173d36]">{tratamiento.nombre}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">S/ {tratamiento.precio.toFixed(2)}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">{tratamiento.duracionMin} min</td>
                        <td className="py-3 pr-4 text-slate-600">{tratamiento.diasProximoTratamiento ? `${tratamiento.diasProximoTratamiento} días` : 'Sin definir'}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                            {tratamiento.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <button type="button" onClick={() => abrirEdicion(tratamiento)} className="text-sm font-semibold text-emerald-700">Editar</button>
                            <button type="button" onClick={() => void deleteTreatment(tratamiento.id)} className="text-sm font-semibold text-rose-600">Eliminar</button>
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
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
        >
          <div className="card-surface w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-emerald-900">{editingId ? 'Editar tratamiento' : 'Nuevo tratamiento'}</h2>
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Cerrar"
              >✕</button>
            </div>

            <div className="mt-6 space-y-4">
              <label htmlFor="tratamiento-nombre" className="block text-sm font-medium text-slate-700">Nombre</label>
              <input id="tratamiento-nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className="field" />
              <label htmlFor="tratamiento-descripcion" className="block text-sm font-medium text-slate-700">Descripción</label>
              <textarea id="tratamiento-descripcion" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="field min-h-24" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tratamiento-precio" className="block text-sm font-medium text-slate-700">Precio</label>
                  <input id="tratamiento-precio" type="number" value={form.precio} onChange={(event) => setForm({ ...form, precio: Number(event.target.value) })} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="tratamiento-duracion" className="block text-sm font-medium text-slate-700">Duración (min)</label>
                  <input id="tratamiento-duracion" type="number" value={form.duracionMin} onChange={(event) => setForm({ ...form, duracionMin: Number(event.target.value) })} className="field mt-2" />
                </div>
              </div>
              <div>
                <label htmlFor="tratamiento-dias" className="block text-sm font-medium text-slate-700">Días sugeridos para el próximo tratamiento <span className="text-rose-600">*</span></label>
                <input id="tratamiento-dias" type="number" min={1} required value={form.diasProximoTratamiento} onChange={(event) => setForm({ ...form, diasProximoTratamiento: event.target.value })} className="field mt-2" placeholder="Ej. 30" />
                <p className="mt-1 text-xs text-slate-500">Obligatorio. Se usa para calcular la fecha sugerida en Seguimiento de clientes y se propone al finalizar una atención con este tratamiento.</p>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-emerald-900">Productos consumidos</h3>
                    <p className="mt-1 text-xs text-slate-500">Ejemplo: algodón 2 unidades, alcohol 10 ml.</p>
                  </div>
                  <button type="button" onClick={addInsumo} className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">+ Agregar</button>
                </div>
                <div className="mt-4 space-y-3">
                  {form.insumos.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Este tratamiento no tiene insumos asignados.</p>}
                  {form.insumos.map((insumo, index) => (
                    <div key={`${insumo.productoId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_0.6fr_0.7fr_auto]">
                      <select aria-label="Producto del insumo" value={insumo.productoId} onChange={(event) => updateInsumo(index, { productoId: event.target.value })} className="field">
                        <option value="">Selecciona producto</option>
                        {productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} · stock {producto.stock}</option>)}
                      </select>
                      <input aria-label="Cantidad del insumo" type="number" min="0.01" step="0.01" value={insumo.cantidad} onChange={(event) => updateInsumo(index, { cantidad: Number(event.target.value) })} className="field" />
                      <input aria-label="Unidad del insumo" value={insumo.unidad} onChange={(event) => updateInsumo(index, { unidad: event.target.value })} className="field" placeholder="unidad" />
                      <button type="button" onClick={() => removeInsumo(index)} className="px-2 text-sm text-rose-600">Quitar</button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={loading || !form.nombre || Number(form.diasProximoTratamiento) <= 0}
                onClick={() => void handleSubmit()}
                className="btn-brand flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Spinner />}
                {loading ? 'Guardando...' : editingId ? 'Actualizar tratamiento' : 'Crear tratamiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
