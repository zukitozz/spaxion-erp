'use client'

import { useEffect, useMemo, useState } from 'react'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precioVenta: number
  precioCosto: number | null
  stock: number
  alertaStock: number
  codigoBarras: string | null
  imagenUrl: string | null
}

const PAGE_SIZE = 10

function normalizeProducto(value: Partial<Producto>): Producto {
  return {
    id: value.id || crypto.randomUUID(),
    nombre: value.nombre || 'Producto sin nombre',
    descripcion: value.descripcion || null,
    precioVenta: typeof value.precioVenta === 'number' ? value.precioVenta : Number(value.precioVenta) || 0,
    precioCosto: typeof value.precioCosto === 'number' ? value.precioCosto : Number(value.precioCosto) || 0,
    stock: typeof value.stock === 'number' ? value.stock : Number(value.stock) || 0,
    alertaStock: typeof value.alertaStock === 'number' ? value.alertaStock : Number(value.alertaStock) || 5,
    codigoBarras: value.codigoBarras || null,
    imagenUrl: value.imagenUrl || null,
  }
}

const emptyForm = { nombre: '', descripcion: '', precioVenta: 0, precioCosto: 0, stock: 0, alertaStock: 5, codigoBarras: '' }

export default function ProductosPage() {
  const toast = useToast()
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [subiendoFotoId, setSubiendoFotoId] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const load = async () => {
    const res = await fetch('/api/productos')
    const data = await res.json()
    setProductos(Array.isArray(data) ? data.map(normalizeProducto) : [])
    setCargando(false)
  }

  useEffect(() => { void load() }, [])

  const productosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase()
    if (!query) return productos
    return productos.filter((producto) => producto.nombre.toLowerCase().includes(query))
  }, [productos, busqueda])

  const totalPages = Math.max(1, Math.ceil(productosFiltrados.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, totalPages)
  const productosPagina = productosFiltrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)

  useEffect(() => { setPagina(1) }, [busqueda])

  const abrirNuevo = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMostrarFormulario(true)
  }

  const abrirEdicion = (producto: Producto) => {
    setEditingId(producto.id)
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precioVenta: producto.precioVenta,
      precioCosto: producto.precioCosto || 0,
      stock: producto.stock,
      alertaStock: producto.alertaStock,
      codigoBarras: producto.codigoBarras || '',
    })
    setMostrarFormulario(true)
  }

  const handleGuardar = async () => {
    setLoading(true)
    const response = await fetch('/api/productos', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
    })
    const result = await response.json()
    setLoading(false)
    if (!response.ok) {
      toast.error(result.error || 'No se pudo guardar el producto')
      return
    }
    const guardado = normalizeProducto(result)
    setProductos((prev) => (editingId ? prev.map((item) => (item.id === editingId ? guardado : item)) : [guardado, ...prev]))
    setMostrarFormulario(false)
    toast.success(editingId ? 'Producto actualizado' : 'Producto creado')
  }

  const handleEliminar = async (id: string) => {
    const response = await fetch(`/api/productos?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      toast.error(data?.error || 'No se pudo eliminar el producto')
      return
    }
    setProductos((prev) => prev.filter((item) => item.id !== id))
    toast.success('Producto eliminado')
  }

  const subirFoto = async (id: string, file: File) => {
    setSubiendoFotoId(id)
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`/api/productos/${id}/imagen`, { method: 'POST', body })
    setSubiendoFotoId(null)
    if (!response.ok) {
      const data = await response.json()
      toast.error(data.error || 'No se pudo subir la foto')
      return
    }
    const updated = normalizeProducto(await response.json())
    setProductos((prev) => prev.map((item) => (item.id === id ? updated : item)))
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Productos</p>
          <h1 className="mt-3 page-heading text-3xl">Control de inventario</h1>
          <p className="mt-2 text-slate-600">Registra productos, precios y niveles de stock bajos.</p>
        </div>

        <div className="card-surface">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-emerald-900">Listado</h2>
            <button type="button" onClick={abrirNuevo} className="rounded-full bg-[#00483f] px-5 py-2 text-sm font-bold text-white transition hover:brightness-110">+ Nuevo producto</button>
          </div>

          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre..."
            className="field mt-4"
          />

          <div className="mt-6">
            {cargando ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando productos...</p>
            ) : productosPagina.length === 0 ? (
              <p className="text-sm text-slate-500">No se encontraron productos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Foto</th>
                      <th className="pb-3 pr-4">Nombre</th>
                      <th className="pb-3 pr-4 text-right">Precio venta</th>
                      <th className="pb-3 pr-4 text-right">Stock</th>
                      <th className="pb-3 pr-4">Estado</th>
                      <th className="pb-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosPagina.map((producto) => (
                      <tr key={producto.id} className="border-t border-[#eef1ec]">
                        <td className="py-3 pr-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                            {producto.imagenUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={producto.imagenUrl} alt={producto.nombre} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-slate-400">Sin foto</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-[#173d36]">{producto.nombre}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">S/ {Number(producto.precioVenta || 0).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">{producto.stock}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${producto.stock <= producto.alertaStock ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                            {producto.stock <= producto.alertaStock ? 'Stock bajo' : 'Stock OK'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <button type="button" onClick={() => abrirEdicion(producto)} className="text-sm font-semibold text-emerald-700">Editar</button>
                            <button type="button" onClick={() => void handleEliminar(producto.id)} className="text-sm font-semibold text-rose-600">Eliminar</button>
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
          onClick={() => setMostrarFormulario(false)}
        >
          <div className="card-surface w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-emerald-900">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Cerrar"
              >✕</button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                className="field"
              />

              <label className="block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                className="field min-h-24"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Precio venta</label>
                  <input
                    type="number"
                    value={form.precioVenta}
                    onChange={(event) => setForm((prev) => ({ ...prev, precioVenta: Number(event.target.value) }))}
                    className="field mt-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Precio costo</label>
                  <input
                    type="number"
                    value={form.precioCosto}
                    onChange={(event) => setForm((prev) => ({ ...prev, precioCosto: Number(event.target.value) }))}
                    className="field mt-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(event) => setForm((prev) => ({ ...prev, stock: Number(event.target.value) }))}
                    className="field mt-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Alerta de stock</label>
                  <input
                    type="number"
                    value={form.alertaStock}
                    onChange={(event) => setForm((prev) => ({ ...prev, alertaStock: Number(event.target.value) }))}
                    className="field mt-2"
                  />
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">Código de barras (opcional)</label>
              <input
                value={form.codigoBarras}
                onChange={(event) => setForm((prev) => ({ ...prev, codigoBarras: event.target.value }))}
                className="field"
                placeholder="Escanea o escribe el código"
              />

              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Foto del producto</label>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    {subiendoFotoId === editingId && <Spinner />}
                    {subiendoFotoId === editingId ? 'Subiendo...' : 'Subir foto'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      className="hidden"
                      disabled={subiendoFotoId === editingId}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void subirFoto(editingId, file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              )}

              <button
                type="button"
                disabled={loading || !form.nombre}
                onClick={() => void handleGuardar()}
                className="btn-brand flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Spinner />}
                {loading ? 'Guardando...' : editingId ? 'Actualizar producto' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
