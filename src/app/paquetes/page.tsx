'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'
import { SearchSelect } from '@/components/SearchSelect'

const PAGE_SIZE = 10

const NOMBRE_METODO_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito en cuenta',
  MIXTO: 'Mixto',
}

const METODOS_PAGO_ABONO = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'DEPOSITO'] as const

interface Cliente {
  id: string
  nombre: string
}

interface Tratamiento {
  id: string
  nombre: string
  activo: boolean
}

interface Abono {
  id: string
  numeracionComprobante: string | null
  total: number
  metodoPago: string
  fechaHora: string | null
  activo: boolean
}

interface Sesion {
  id: string
  numero: number
  fecha: string
  notas: string | null
}

interface Paquete {
  id: string
  nombre: string
  sesionesTotal: number
  precioTotal: number
  estado: 'ABIERTO' | 'CERRADO'
  pagado: number
  saldo: number
  cliente: Cliente
  tratamiento: Tratamiento | null
  facturas: Abono[]
  sesiones: Sesion[]
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PaquetesPage() {
  const { data: session } = useSession()
  const toast = useToast()
  const puedeEmitirComprobante = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERVISOR'

  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [creando, setCreando] = useState(false)
  const [nuevoPaquete, setNuevoPaquete] = useState({ clienteNombre: '', tratamientoId: '', nombre: '', sesionesTotal: '10', precioTotal: '' })

  const [paqueteAbiertoId, setPaqueteAbiertoId] = useState<string | null>(null)
  const [abonoForm, setAbonoForm] = useState({ monto: '', metodoPago: 'EFECTIVO' })
  const [notasSeleccionadas, setNotasSeleccionadas] = useState<Set<string>>(new Set())
  const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA')
  const [enviando, setEnviando] = useState(false)
  const [sesionForm, setSesionForm] = useState({ fecha: hoyISO(), notas: '' })
  const [registrandoSesion, setRegistrandoSesion] = useState(false)
  const [eliminandoSesionId, setEliminandoSesionId] = useState<string | null>(null)

  const loadData = async () => {
    const [paquetesRes, clientesRes, tratamientosRes] = await Promise.all([
      fetch('/api/paquetes'),
      fetch('/api/clientes'),
      fetch('/api/tratamientos'),
    ])
    const [paquetesData, clientesData, tratamientosData] = await Promise.all([
      paquetesRes.json(),
      clientesRes.json(),
      tratamientosRes.json(),
    ])
    setPaquetes(Array.isArray(paquetesData) ? paquetesData : [])
    setClientes(Array.isArray(clientesData) ? clientesData : [])
    setTratamientos(Array.isArray(tratamientosData) ? tratamientosData.filter((t: Tratamiento) => t.activo) : [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const totalPaginas = Math.max(1, Math.ceil(paquetes.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, totalPaginas)
  const paquetesPagina = paquetes.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)

  const paqueteAbierto = useMemo(() => paquetes.find((p) => p.id === paqueteAbiertoId) || null, [paquetes, paqueteAbiertoId])

  const totalNotasSeleccionadas = useMemo(() => {
    if (!paqueteAbierto) return 0
    return paqueteAbierto.facturas.filter((factura) => notasSeleccionadas.has(factura.id)).reduce((sum, factura) => sum + factura.total, 0)
  }, [paqueteAbierto, notasSeleccionadas])

  const abrirDetalle = (paquete: Paquete) => {
    setPaqueteAbiertoId(paquete.id)
    setAbonoForm({ monto: paquete.saldo.toFixed(2), metodoPago: 'EFECTIVO' })
    setNotasSeleccionadas(new Set(paquete.facturas.map((factura) => factura.id)))
    setTipoComprobante('BOLETA')
    setSesionForm({ fecha: hoyISO(), notas: '' })
  }

  const cerrarDetalle = () => {
    setPaqueteAbiertoId(null)
  }

  const handleCrearPaquete = async () => {
    const cliente = clientes.find((c) => c.nombre.toLowerCase() === nuevoPaquete.clienteNombre.trim().toLowerCase())
    if (!cliente) {
      toast.error('Selecciona un cliente válido de la lista')
      return
    }
    if (!nuevoPaquete.nombre.trim()) {
      toast.error('Ingresa un nombre para el paquete')
      return
    }
    const sesionesTotal = Number(nuevoPaquete.sesionesTotal)
    const precioTotal = Number(nuevoPaquete.precioTotal)
    if (!Number.isInteger(sesionesTotal) || sesionesTotal <= 0) {
      toast.error('El número de sesiones debe ser un entero mayor a 0')
      return
    }
    if (!Number.isFinite(precioTotal) || precioTotal <= 0) {
      toast.error('El precio total debe ser mayor a 0')
      return
    }

    setCreando(true)
    const response = await fetch('/api/paquetes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: cliente.id,
        tratamientoId: nuevoPaquete.tratamientoId || undefined,
        nombre: nuevoPaquete.nombre.trim(),
        sesionesTotal,
        precioTotal,
      }),
    })
    const data = await response.json().catch(() => null)
    setCreando(false)

    if (!response.ok) {
      toast.error(data?.error || 'No se pudo crear el paquete')
      return
    }

    toast.success('Paquete creado correctamente')
    setMostrarFormulario(false)
    setNuevoPaquete({ clienteNombre: '', tratamientoId: '', nombre: '', sesionesTotal: '10', precioTotal: '' })
    await loadData()
  }

  const handleRegistrarAbono = async (paqueteId: string) => {
    const monto = Number(abonoForm.monto)
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setEnviando(true)
    const response = await fetch(`/api/paquetes/${paqueteId}/abonos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monto, metodoPago: abonoForm.metodoPago }),
    })
    const data = await response.json().catch(() => null)
    setEnviando(false)

    if (!response.ok) {
      toast.error(data?.error || 'No se pudo registrar el abono')
      return
    }

    toast.success('Abono registrado correctamente')
    setAbonoForm({ monto: '', metodoPago: 'EFECTIVO' })
    await loadData()
  }

  const handleRegistrarSesion = async (paqueteId: string) => {
    setRegistrandoSesion(true)
    const response = await fetch(`/api/paquetes/${paqueteId}/sesiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: sesionForm.fecha, notas: sesionForm.notas || undefined }),
    })
    const data = await response.json().catch(() => null)
    setRegistrandoSesion(false)

    if (!response.ok) {
      toast.error(data?.error || 'No se pudo registrar la sesión')
      return
    }

    toast.success('Sesión registrada correctamente')
    setSesionForm({ fecha: hoyISO(), notas: '' })
    await loadData()
  }

  const handleEliminarSesion = async (paqueteId: string, sesionId: string) => {
    setEliminandoSesionId(sesionId)
    const response = await fetch(`/api/paquetes/${paqueteId}/sesiones/${sesionId}`, { method: 'DELETE' })
    const data = await response.json().catch(() => null)
    setEliminandoSesionId(null)

    if (!response.ok) {
      toast.error(data?.error || 'No se pudo eliminar la sesión')
      return
    }

    toast.success('Sesión eliminada')
    await loadData()
  }

  const handleEmitirComprobante = async (paqueteId: string) => {
    if (notasSeleccionadas.size === 0) {
      toast.error('Selecciona al menos una nota de venta')
      return
    }

    setEnviando(true)
    const response = await fetch(`/api/paquetes/${paqueteId}/cerrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: tipoComprobante, notaIds: [...notasSeleccionadas] }),
    })
    const data = await response.json().catch(() => null)
    setEnviando(false)

    if (!response.ok) {
      toast.error(data?.error || 'El comprobante se registró, pero falló el envío a SUNAT (puedes reintentarlo desde Facturación)')
      cerrarDetalle()
      await loadData()
      return
    }

    toast.success('Comprobante final emitido correctamente')
    cerrarDetalle()
    await loadData()
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Paquetes</p>
            <h1 className="page-heading mt-3 text-3xl">Sesiones con pagos parciales</h1>
            <p className="mt-2 text-slate-600">Registra abonos conforme el cliente va pagando y emite el comprobante final cuando complete el pago.</p>
          </div>
          <button type="button" onClick={() => setMostrarFormulario(true)} className="btn-primary shrink-0">
            Nuevo paquete
          </button>
        </div>

        {mostrarFormulario && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
            <div className="card-surface w-full max-w-lg">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-[#173d36]">Nuevo paquete</h2>
                <button type="button" onClick={() => setMostrarFormulario(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Cerrar">✕</button>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="paquete-cliente" className="block text-sm font-medium text-slate-700">Cliente</label>
                  <input
                    id="paquete-cliente"
                    list="paquete-clientes-datalist"
                    value={nuevoPaquete.clienteNombre}
                    onChange={(event) => setNuevoPaquete((prev) => ({ ...prev, clienteNombre: event.target.value }))}
                    placeholder="Escribe el nombre del cliente"
                    autoComplete="off"
                    className="field mt-2"
                  />
                  <datalist id="paquete-clientes-datalist">
                    {clientes.map((cliente) => <option key={cliente.id} value={cliente.nombre} />)}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="paquete-tratamiento" className="block text-sm font-medium text-slate-700">Tratamiento (opcional)</label>
                  <SearchSelect
                    id="paquete-tratamiento"
                    value={nuevoPaquete.tratamientoId}
                    onChange={(value) => setNuevoPaquete((prev) => ({ ...prev, tratamientoId: value }))}
                    placeholder="Sin tratamiento específico"
                    options={tratamientos.map((tratamiento) => ({ value: tratamiento.id, label: tratamiento.nombre }))}
                    className="field mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="paquete-nombre" className="block text-sm font-medium text-slate-700">Nombre del paquete</label>
                  <input
                    id="paquete-nombre"
                    value={nuevoPaquete.nombre}
                    onChange={(event) => setNuevoPaquete((prev) => ({ ...prev, nombre: event.target.value }))}
                    placeholder="Ej. Paquete 10 sesiones - Limpieza facial"
                    className="field mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="paquete-sesiones" className="block text-sm font-medium text-slate-700">Sesiones</label>
                    <input
                      id="paquete-sesiones"
                      type="number"
                      min={1}
                      value={nuevoPaquete.sesionesTotal}
                      onChange={(event) => setNuevoPaquete((prev) => ({ ...prev, sesionesTotal: event.target.value }))}
                      className="field mt-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="paquete-precio" className="block text-sm font-medium text-slate-700">Precio total (S/)</label>
                    <input
                      id="paquete-precio"
                      type="number"
                      min={0}
                      step="0.01"
                      value={nuevoPaquete.precioTotal}
                      onChange={(event) => setNuevoPaquete((prev) => ({ ...prev, precioTotal: event.target.value }))}
                      className="field mt-2"
                    />
                  </div>
                </div>
                <button type="button" disabled={creando} onClick={() => void handleCrearPaquete()} className="btn-primary w-full disabled:opacity-50">
                  {creando ? 'Creando...' : 'Crear paquete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card-surface">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando paquetes...</p>
          ) : paquetesPagina.length === 0 ? (
            <p className="text-sm text-slate-500">No hay paquetes registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4">Cliente</th>
                    <th className="pb-3 pr-4">Paquete</th>
                    <th className="pb-3 pr-4 text-right">Sesiones</th>
                    <th className="pb-3 pr-4 text-right">Total</th>
                    <th className="pb-3 pr-4 text-right">Pagado</th>
                    <th className="pb-3 pr-4 text-right">Saldo</th>
                    <th className="pb-3 pr-4">Estado</th>
                    <th className="pb-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {paquetesPagina.map((paquete) => (
                    <tr
                      key={paquete.id}
                      onClick={() => abrirDetalle(paquete)}
                      className="cursor-pointer border-t border-[#eef1ec] hover:bg-slate-50"
                    >
                      <td className="py-3 pr-4 font-semibold text-[#173d36]">
                        <ClienteHistorialLink clienteId={paquete.cliente.id} nombre={paquete.cliente.nombre} className="hover:text-emerald-700" />
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {paquete.nombre}
                        {paquete.tratamiento && <span className="block text-xs text-slate-400">{paquete.tratamiento.nombre}</span>}
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-600">{paquete.sesiones.length} / {paquete.sesionesTotal}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-[#173d36]">S/ {paquete.precioTotal.toFixed(2)}</td>
                      <td className="py-3 pr-4 text-right text-slate-600">S/ {paquete.pagado.toFixed(2)}</td>
                      <td className={`py-3 pr-4 text-right font-semibold ${paquete.saldo > 0.01 ? 'text-rose-700' : 'text-[#1d6f50]'}`}>
                        S/ {paquete.saldo.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        {paquete.estado === 'CERRADO' ? (
                          <span className="font-semibold text-[#1d6f50]">Cerrado</span>
                        ) : paquete.saldo > 0.01 ? (
                          <span className="font-semibold text-amber-700">Pago pendiente</span>
                        ) : (
                          <span className="font-semibold text-emerald-700">Pagado, falta emitir</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold text-emerald-700">Ver detalle</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6">
            <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
          </div>
        </div>
      </div>

      {paqueteAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="card-surface w-full max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#173d36]">{paqueteAbierto.nombre}</h2>
                <p className="text-sm text-slate-500">
                  <ClienteHistorialLink clienteId={paqueteAbierto.cliente.id} nombre={paqueteAbierto.cliente.nombre} className="hover:text-emerald-700" />
                  {paqueteAbierto.tratamiento && ` · ${paqueteAbierto.tratamiento.nombre}`}
                </p>
              </div>
              <button type="button" onClick={cerrarDetalle} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Cerrar">✕</button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-semibold text-[#173d36]">S/ {paqueteAbierto.precioTotal.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Pagado</p>
                <p className="font-semibold text-slate-700">S/ {paqueteAbierto.pagado.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Saldo</p>
                <p className={`font-semibold ${paqueteAbierto.saldo > 0.01 ? 'text-rose-700' : 'text-[#1d6f50]'}`}>S/ {paqueteAbierto.saldo.toFixed(2)}</p>
              </div>
            </div>

            {/* Sesiones */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Sesiones</h3>
                <span className="text-sm font-semibold text-[#173d36]">{paqueteAbierto.sesiones.length} de {paqueteAbierto.sesionesTotal}</span>
              </div>

              {paqueteAbierto.sesiones.length > 0 && (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                  {paqueteAbierto.sesiones.map((sesion) => (
                    <div key={sesion.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-700">
                        Sesión {sesion.numero} · {new Date(sesion.fecha).toLocaleDateString('es-PE')}
                        {sesion.notas && <span className="text-slate-400"> — {sesion.notas}</span>}
                      </span>
                      <button
                        type="button"
                        disabled={eliminandoSesionId === sesion.id}
                        onClick={() => void handleEliminarSesion(paqueteAbierto.id, sesion.id)}
                        className="text-xs font-semibold text-rose-600 disabled:opacity-50"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {paqueteAbierto.sesiones.length < paqueteAbierto.sesionesTotal ? (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Fecha</label>
                    <input
                      type="date"
                      value={sesionForm.fecha}
                      onChange={(event) => setSesionForm((prev) => ({ ...prev, fecha: event.target.value }))}
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500">Notas (opcional)</label>
                    <input
                      type="text"
                      value={sesionForm.notas}
                      onChange={(event) => setSesionForm((prev) => ({ ...prev, notas: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={registrandoSesion}
                    onClick={() => void handleRegistrarSesion(paqueteAbierto.id)}
                    className="btn-primary disabled:opacity-50"
                  >
                    {registrandoSesion ? 'Registrando...' : 'Registrar sesión'}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-emerald-700">Todas las sesiones fueron registradas.</p>
              )}
            </div>

            {/* Abonos */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Abonos</h3>

              {paqueteAbierto.facturas.length > 0 && (
                <div className="mt-3 space-y-1">
                  {paqueteAbierto.facturas.map((factura) => (
                    <div key={factura.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-mono">{factura.numeracionComprobante || '—'}</span>
                      <span>{factura.fechaHora ? new Date(factura.fechaHora).toLocaleDateString('es-PE') : '—'}</span>
                      <span>{NOMBRE_METODO_PAGO[factura.metodoPago] || factura.metodoPago}</span>
                      <span className="font-semibold text-slate-700">S/ {factura.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {paqueteAbierto.estado === 'ABIERTO' && paqueteAbierto.saldo > 0.01 && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Monto (S/)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={abonoForm.monto}
                      onChange={(event) => setAbonoForm((prev) => ({ ...prev, monto: event.target.value }))}
                      className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Método de pago</label>
                    <select
                      value={abonoForm.metodoPago}
                      onChange={(event) => setAbonoForm((prev) => ({ ...prev, metodoPago: event.target.value }))}
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                    >
                      {METODOS_PAGO_ABONO.map((metodo) => <option key={metodo} value={metodo}>{NOMBRE_METODO_PAGO[metodo]}</option>)}
                    </select>
                  </div>
                  <button type="button" disabled={enviando} onClick={() => void handleRegistrarAbono(paqueteAbierto.id)} className="btn-primary disabled:opacity-50">
                    {enviando ? 'Registrando...' : 'Confirmar abono'}
                  </button>
                </div>
              )}
            </div>

            {/* Cierre */}
            {paqueteAbierto.estado === 'ABIERTO' && paqueteAbierto.saldo <= 0.01 && puedeEmitirComprobante && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Emitir comprobante final</h3>
                <p className="mt-1 text-xs text-slate-500">Deselecciona las notas de venta que no quieras incluir (quedan como notas de venta independientes).</p>
                <div className="mt-3 space-y-1">
                  {paqueteAbierto.facturas.map((factura) => (
                    <label key={factura.id} className="flex items-center gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={notasSeleccionadas.has(factura.id)}
                        onChange={(event) => {
                          setNotasSeleccionadas((prev) => {
                            const next = new Set(prev)
                            if (event.target.checked) next.add(factura.id)
                            else next.delete(factura.id)
                            return next
                          })
                        }}
                      />
                      <span className="w-28 font-mono text-xs">{factura.numeracionComprobante || '—'}</span>
                      <span className="font-semibold">S/ {factura.total.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Tipo de comprobante</label>
                    <select
                      value={tipoComprobante}
                      onChange={(event) => setTipoComprobante(event.target.value as 'BOLETA' | 'FACTURA')}
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="BOLETA">Boleta</option>
                      <option value="FACTURA">Factura</option>
                    </select>
                  </div>
                  <p className="font-semibold text-[#173d36]">Total a emitir: S/ {totalNotasSeleccionadas.toFixed(2)}</p>
                  <button type="button" disabled={enviando || notasSeleccionadas.size === 0} onClick={() => void handleEmitirComprobante(paqueteAbierto.id)} className="btn-primary disabled:opacity-50">
                    {enviando ? 'Emitiendo...' : 'Emitir comprobante final'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
