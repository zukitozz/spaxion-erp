'use client'

import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'

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

const PAGE_SIZE = 10
const tipoMovLabels: Record<Movimiento['tipo'], string> = { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste' }

function PanelGestionInventario({ producto, onUpdated }: { producto: Producto; onUpdated: (producto: Producto) => void }) {
  const toast = useToast()
  const [codigoBarras, setCodigoBarras] = useState(producto.codigoBarras || '')
  const [guardandoCodigo, setGuardandoCodigo] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [movTipo, setMovTipo] = useState<Movimiento['tipo']>('ENTRADA')
  const [movCantidad, setMovCantidad] = useState(1)
  const [movMotivo, setMovMotivo] = useState('')
  const [registrandoMov, setRegistrandoMov] = useState(false)
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null)
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false)

  const guardarCodigo = async () => {
    setGuardandoCodigo(true)
    const response = await fetch('/api/inventario', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: producto.id, codigoBarras: codigoBarras || null }),
    })
    setGuardandoCodigo(false)
    if (!response.ok) {
      const data = await response.json()
      toast.error(data.error || 'No se pudo guardar el código de barras')
      return
    }
    onUpdated(await response.json())
    toast.success('Código de barras guardado')
  }

  const subirFoto = async (file: File) => {
    setSubiendoFoto(true)
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`/api/productos/${producto.id}/imagen`, { method: 'POST', body })
    setSubiendoFoto(false)
    if (!response.ok) {
      const data = await response.json()
      toast.error(data.error || 'No se pudo subir la foto')
      return
    }
    onUpdated(await response.json())
  }

  const cargarMovimientos = async () => {
    setCargandoMovimientos(true)
    const response = await fetch(`/api/inventario/movimientos?productoId=${producto.id}`)
    const data = await response.json()
    setMovimientos(Array.isArray(data) ? data : [])
    setCargandoMovimientos(false)
  }

  const registrarMovimiento = async () => {
    setRegistrandoMov(true)
    const response = await fetch('/api/inventario/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productoId: producto.id, tipo: movTipo, cantidad: movCantidad, motivo: movMotivo || undefined }),
    })
    setRegistrandoMov(false)
    if (!response.ok) {
      const data = await response.json()
      toast.error(data.error || 'No se pudo registrar el movimiento')
      return
    }
    const data = await response.json()
    onUpdated(data.producto)
    setMovCantidad(1)
    setMovMotivo('')
    toast.success('Movimiento registrado')
    if (movimientos) void cargarMovimientos()
  }

  return (
    <div>
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

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1">
          <label className="block text-xs font-medium text-slate-700">Código de barras</label>
          <input value={codigoBarras} onChange={(event) => setCodigoBarras(event.target.value)} className="field !mt-1" placeholder="Escanea o escribe el código" />
        </div>
        <button type="button" onClick={() => void guardarCodigo()} disabled={guardandoCodigo} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
          {guardandoCodigo && <Spinner />}
          {guardandoCodigo ? 'Guardando...' : 'Guardar código'}
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          {subiendoFoto && <Spinner />}
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
          <button type="button" disabled={registrandoMov} onClick={() => void registrarMovimiento()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60">
            {registrandoMov && <Spinner />}
            {registrandoMov ? 'Guardando...' : 'Registrar'}
          </button>
        </div>

        <button type="button" onClick={() => (movimientos ? setMovimientos(null) : void cargarMovimientos())} className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
          {cargandoMovimientos && <Spinner />}
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
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null)

  const load = async () => {
    const response = await fetch('/api/inventario')
    const data = await response.json()
    setProductos(Array.isArray(data) ? data : [])
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

  const handleUpdated = (updated: Producto) => {
    setProductos((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
    setSeleccionado((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Inventario</p>
          <h1 className="mt-3 page-heading text-3xl">Control estándar de stock</h1>
          <p className="mt-2 text-slate-600">Código de barras, foto de producto y movimientos de entrada/salida/ajuste con trazabilidad.</p>
        </div>

        <div className="card-surface">
          <h2 className="text-xl font-semibold text-emerald-900">Listado</h2>

          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre..."
            className="field mt-4"
          />

          <div className="mt-6">
            {cargando ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando inventario...</p>
            ) : productosPagina.length === 0 ? (
              <p className="text-sm text-slate-500">No se encontraron productos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Nombre</th>
                      <th className="pb-3 pr-4 text-right">Precio venta</th>
                      <th className="pb-3 pr-4 text-right">Stock</th>
                      <th className="pb-3 pr-4">Estado</th>
                      <th className="pb-3 pr-4">Código de barras</th>
                      <th className="pb-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosPagina.map((producto) => (
                      <tr key={producto.id} className="border-t border-[#eef1ec]">
                        <td className="py-3 pr-4 font-semibold text-[#173d36]">{producto.nombre}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">S/ {producto.precioVenta.toFixed(2)}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">{producto.stock}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${producto.stock <= producto.alertaStock ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                            {producto.stock <= producto.alertaStock ? 'Stock bajo' : 'Stock OK'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{producto.codigoBarras || 'Sin asignar'}</td>
                        <td className="py-3">
                          <button type="button" onClick={() => setSeleccionado(producto)} className="text-sm font-semibold text-emerald-700">Gestionar</button>
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

      {seleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
          onClick={() => setSeleccionado(null)}
        >
          <div className="card-surface w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-emerald-900">Gestionar inventario</h2>
              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Cerrar"
              >✕</button>
            </div>
            <div className="mt-6">
              <PanelGestionInventario producto={seleccionado} onUpdated={handleUpdated} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
