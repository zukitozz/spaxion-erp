'use client'

import { useEffect, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precioVenta: number
  stock: number
  alertaStock: number
  codigoBarras: string | null
  imagenUrl: string | null
}

interface Movimiento {
  id: string
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  cantidad: number
  stockAnterior: number
  stockNuevo: number
  motivo: string | null
  creadoAt: string
  usuario: { name: string }
}

const tipoMovLabels: Record<Movimiento['tipo'], string> = { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste' }

function ProductoCard({ producto, onUpdated }: { producto: Producto; onUpdated: (producto: Producto) => void }) {
  const [codigoBarras, setCodigoBarras] = useState(producto.codigoBarras || '')
  const [guardandoCodigo, setGuardandoCodigo] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [movTipo, setMovTipo] = useState<Movimiento['tipo']>('ENTRADA')
  const [movCantidad, setMovCantidad] = useState(1)
  const [movMotivo, setMovMotivo] = useState('')
  const [registrandoMov, setRegistrandoMov] = useState(false)
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null)
  const [error, setError] = useState('')

  const guardarCodigo = async () => {
    setGuardandoCodigo(true)
    setError('')
    const response = await fetch('/api/inventario', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: producto.id, codigoBarras: codigoBarras || null }),
    })
    setGuardandoCodigo(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo guardar el código de barras')
      return
    }
    onUpdated(await response.json())
  }

  const subirFoto = async (file: File) => {
    setSubiendoFoto(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`/api/productos/${producto.id}/imagen`, { method: 'POST', body })
    setSubiendoFoto(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo subir la foto')
      return
    }
    onUpdated(await response.json())
  }

  const cargarMovimientos = async () => {
    const response = await fetch(`/api/inventario/movimientos?productoId=${producto.id}`)
    const data = await response.json()
    setMovimientos(Array.isArray(data) ? data : [])
  }

  const registrarMovimiento = async () => {
    setRegistrandoMov(true)
    setError('')
    const response = await fetch('/api/inventario/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productoId: producto.id, tipo: movTipo, cantidad: movCantidad, motivo: movMotivo || undefined }),
    })
    setRegistrandoMov(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo registrar el movimiento')
      return
    }
    const data = await response.json()
    onUpdated(data.producto)
    setMovCantidad(1)
    setMovMotivo('')
    if (movimientos) void cargarMovimientos()
  }

  return (
    <div className="card-surface">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          {producto.imagenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producto.imagenUrl} alt={producto.nombre} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={28} className="text-slate-300" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-lg font-semibold text-slate-900">{producto.nombre}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${producto.stock <= producto.alertaStock ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
              {producto.stock <= producto.alertaStock ? 'Stock bajo' : 'Stock OK'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">S/ {producto.precioVenta.toFixed(2)} · Stock {producto.stock} · Alerta {producto.alertaStock}</p>
          <p className="mt-1 text-sm text-slate-600">{producto.descripcion || 'Sin descripción'}</p>
        </div>
      </div>

      {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-xs text-rose-900">{error}</p>}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1">
          <label className="block text-xs font-medium text-slate-700">Código de barras</label>
          <input value={codigoBarras} onChange={(event) => setCodigoBarras(event.target.value)} className="field !mt-1" placeholder="Escanea o escribe el código" />
        </div>
        <button type="button" onClick={() => void guardarCodigo()} disabled={guardandoCodigo} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
          {guardandoCodigo ? 'Guardando...' : 'Guardar código'}
        </button>
        <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          {subiendoFoto ? 'Subiendo...' : 'Subir foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            disabled={subiendoFoto}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void subirFoto(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Registrar movimiento</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Tipo</label>
            <select value={movTipo} onChange={(event) => setMovTipo(event.target.value as Movimiento['tipo'])} className="field !mt-1 !w-auto">
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
              <option value="AJUSTE">Ajuste (fijar stock)</option>
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-slate-700">Cantidad</label>
            <input type="number" min={0} value={movCantidad} onChange={(event) => setMovCantidad(Number(event.target.value) || 0)} className="field !mt-1" />
          </div>
          <div className="min-w-[10rem] flex-1">
            <label className="block text-xs font-medium text-slate-700">Motivo (opcional)</label>
            <input value={movMotivo} onChange={(event) => setMovMotivo(event.target.value)} className="field !mt-1" />
          </div>
          <button type="button" disabled={registrandoMov} onClick={() => void registrarMovimiento()} className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60">
            {registrandoMov ? 'Guardando...' : 'Registrar'}
          </button>
        </div>

        <button type="button" onClick={() => (movimientos ? setMovimientos(null) : void cargarMovimientos())} className="mt-3 text-xs font-semibold text-emerald-700">
          {movimientos ? 'Ocultar historial' : 'Ver historial de movimientos'}
        </button>

        {movimientos && (
          <div className="mt-2 space-y-1">
            {movimientos.length === 0 ? (
              <p className="text-xs text-slate-500">Sin movimientos registrados.</p>
            ) : (
              movimientos.map((mov) => (
                <div key={mov.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>{tipoMovLabels[mov.tipo]} · {mov.cantidad} · {mov.stockAnterior} → {mov.stockNuevo}{mov.motivo ? ` · ${mov.motivo}` : ''}</span>
                  <span className="text-slate-400">{new Date(mov.creadoAt).toLocaleString('es-PE')} · {mov.usuario.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const response = await fetch('/api/inventario')
    const data = await response.json()
    setProductos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleUpdated = (updated: Producto) => {
    setProductos((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Inventario</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900">Control estándar de stock</h1>
          <p className="mt-2 text-slate-600">Código de barras, foto de producto y movimientos de entrada/salida/ajuste con trazabilidad.</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          {loading ? (
            <div className="card-surface">Cargando inventario...</div>
          ) : productos.length === 0 ? (
            <div className="card-surface">No hay productos registrados.</div>
          ) : (
            productos.map((producto) => <ProductoCard key={producto.id} producto={producto} onUpdated={handleUpdated} />)
          )}
        </section>
      </div>
    </div>
  )
}
