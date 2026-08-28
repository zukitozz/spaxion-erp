'use client'

import { useEffect, useState } from 'react'

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

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [form, setForm] = useState({ nombre: '', descripcion: '', precioVenta: 0, precioCosto: 0, stock: 0, alertaStock: 5, codigoBarras: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [subiendoFotoId, setSubiendoFotoId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/productos')
      .then((res) => res.json())
      .then((data) => setProductos(Array.isArray(data) ? data.map(normalizeProducto) : []))
  }, [])

  const handleCreate = async () => {
    setLoading(true)
    const response = await fetch('/api/productos', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    console.log('Response status:', response)
    const result = await response.json()
    if (!response.ok) {
      window.alert(result.error || 'No se pudo guardar el producto')
      setLoading(false)
      return
    }
    const created = normalizeProducto(result)
    setProductos((prev) => editingId ? prev.map((item) => item.id === editingId ? created : item) : [created, ...prev])
    setForm({ nombre: '', descripcion: '', precioVenta: 0, precioCosto: 0, stock: 0, alertaStock: 5, codigoBarras: '' })
    setEditingId(null)
    setLoading(false)
  }

  const subirFoto = async (id: string, file: File) => {
    setSubiendoFotoId(id)
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`/api/productos/${id}/imagen`, { method: 'POST', body })
    setSubiendoFotoId(null)
    if (!response.ok) {
      const data = await response.json()
      window.alert(data.error || 'No se pudo subir la foto')
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

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Nuevo producto</h2>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <label className="block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Precio venta</label>
                <input
                  type="number"
                  value={form.precioVenta}
                  onChange={(event) => setForm((prev) => ({ ...prev, precioVenta: Number(event.target.value) }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <label className="block text-sm font-medium text-slate-700">Precio costo</label>
                <input
                  type="number"
                  value={form.precioCosto}
                  onChange={(event) => setForm((prev) => ({ ...prev, precioCosto: Number(event.target.value) }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Stock</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(event) => setForm((prev) => ({ ...prev, stock: Number(event.target.value) }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <label className="block text-sm font-medium text-slate-700">Alerta de stock</label>
                <input
                  type="number"
                  value={form.alertaStock}
                  onChange={(event) => setForm((prev) => ({ ...prev, alertaStock: Number(event.target.value) }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <label className="block text-sm font-medium text-slate-700">Código de barras (opcional)</label>
              <input
                value={form.codigoBarras}
                onChange={(event) => setForm((prev) => ({ ...prev, codigoBarras: event.target.value }))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Escanea o escribe el código"
              />

              <button
                type="button"
                disabled={loading}
                onClick={handleCreate}
                className="btn-brand w-full disabled:opacity-60"
              >
                {loading ? 'Guardando...' : editingId ? 'Actualizar producto' : 'Crear producto'}
              </button>
            </div>
          </div>

          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Listado</h2>
            <div className="mt-6 space-y-4">
              {productos.map((producto) => (
                <div key={producto.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                      {producto.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={producto.imagenUrl} alt={producto.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-300">Sin foto</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-lg font-semibold text-slate-900">{producto.nombre}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${producto.stock <= producto.alertaStock ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                          {producto.stock <= producto.alertaStock ? 'Stock bajo' : 'Stock OK'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">S/ {Number(producto.precioVenta || 0).toFixed(2)} · Stock {producto.stock}{producto.codigoBarras ? ` · Código ${producto.codigoBarras}` : ''}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{producto.descripcion}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => { setEditingId(producto.id); setForm({ nombre: producto.nombre, descripcion: producto.descripcion || '', precioVenta: producto.precioVenta, precioCosto: producto.precioCosto || 0, stock: producto.stock, alertaStock: producto.alertaStock, codigoBarras: producto.codigoBarras || '' }) }} className="text-sm font-semibold text-emerald-700">Editar</button>
                    <button type="button" onClick={async () => { await fetch(`/api/productos?id=${producto.id}`, { method: 'DELETE' }); setProductos((prev) => prev.filter((item) => item.id !== producto.id)) }} className="text-sm font-semibold text-rose-600">Eliminar</button>
                    <label className="cursor-pointer text-sm font-semibold text-slate-600">
                      {subiendoFotoId === producto.id ? 'Subiendo...' : 'Subir foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        className="hidden"
                        disabled={subiendoFotoId === producto.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void subirFoto(producto.id, file)
                          event.target.value = ''
                        }}
                      />
                    </label>
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
