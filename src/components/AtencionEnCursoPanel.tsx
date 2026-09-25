'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'
import { AtencionFotos } from '@/components/AtencionFotos'
import { useToast } from '@/components/Toast'

type LineaEstado = 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA'

interface Cliente { id: string; nombre: string }
interface Tratamiento { id: string; nombre: string; precio: number; activo: boolean; diasProximoTratamiento?: number | null }
interface Esteticista { id: string; name: string }
interface CitaPendiente { id: string; fecha: string; tratamiento: string; estado: string; registrado: boolean; cliente: Cliente | null }
interface Configuracion { horasExpiracionCita: number }
interface Producto { id: string; nombre: string; precioVenta: number; stock: number }
interface AtencionProductoItem { id: string; cantidad: number; precioUnit: number; precioCatalogo: number | null; producto: { id: string; nombre: string } }

interface LineaTratamiento {
  id: string
  estado: LineaEstado
  horaInicio: string | null
  horaFin: string | null
  diasProximoTratamiento: number | null
  precio: number | null
  precioCatalogo: number | null
  tratamiento: { id: string; nombre: string; diasProximoTratamiento?: number | null }
  esteticista: { id: string; name: string }
}

/** true si el precio acordado difiere del precio de catálogo capturado en ese momento. */
function precioFueModificado(precio: number | null, precioCatalogo: number | null) {
  if (precio == null || precioCatalogo == null) return false
  return Math.abs(precio - precioCatalogo) > 0.005
}

export interface AtencionDetalle {
  id: string
  horaInicio: string
  cliente: { id: string; nombre: string }
  tratamientos: LineaTratamiento[]
}

interface AtencionEnCursoPanelProps {
  atencion: AtencionDetalle | null
  /** Solo aplica al crear una atención nueva reservando una cabina (flujo legado). */
  cabinaId?: string
  onClose: () => void
  onChanged: () => void
}

const estadoLabels: Record<LineaEstado, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

const estadoStyles: Record<LineaEstado, string> = {
  PENDIENTE: 'bg-slate-100 text-slate-700',
  EN_CURSO: 'bg-amber-100 text-amber-900',
  FINALIZADA: 'bg-emerald-100 text-emerald-900',
  CANCELADA: 'bg-rose-100 text-rose-700',
}

function formatearHora(fecha: string | null) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function calcularDuracion(linea: LineaTratamiento) {
  if (!linea.horaInicio) return '—'
  const fin = linea.horaFin ? new Date(linea.horaFin).getTime() : Date.now()
  const minutos = Math.round((fin - new Date(linea.horaInicio).getTime()) / 60000)
  if (minutos < 60) return `${minutos} min`
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`
}

export function AtencionEnCursoPanel({ atencion, cabinaId, onClose, onChanged }: AtencionEnCursoPanelProps) {
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useSession()
  const rol = session?.user?.role
  const userId = session?.user?.id

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [esteticistas, setEsteticistas] = useState<Esteticista[]>([])
  const [citas, setCitas] = useState<CitaPendiente[]>([])
  const [horasExpiracionCita, setHorasExpiracionCita] = useState(24)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // --- Formulario para crear una atención nueva (sin cabina) ---
  const [modo, setModo] = useState<'walkin' | 'cita'>('walkin')
  const [form, setForm] = useState({ clienteId: '', tratamientoId: '', esteticistaId: '', citaId: '', notas: '', precio: '' })
  const [clienteQuery, setClienteQuery] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [tratamientoQuery, setTratamientoQuery] = useState('')
  const [showTratamientoDropdown, setShowTratamientoDropdown] = useState(false)

  // --- Formulario único para agregar un tratamiento o un producto a la visita ---
  const [nuevoItemValue, setNuevoItemValue] = useState('') // 't:<tratamientoId>' | 'p:<productoId>' | ''
  const [nuevoEsteticistaId, setNuevoEsteticistaId] = useState('')
  const [nuevaCantidad, setNuevaCantidad] = useState(1)
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [agregandoItem, setAgregandoItem] = useState(false)
  const puedeCambiarPrecio = rol === 'ADMIN' || rol === 'SUPERVISOR'
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosAtencion, setProductosAtencion] = useState<AtencionProductoItem[]>([])

  const [tipoNuevoItem, idNuevoItem] = useMemo(
    () => (nuevoItemValue ? (nuevoItemValue.split(':') as [string, string]) : ['', '']),
    [nuevoItemValue]
  )

  const [diasProximoTratamientoPorLinea, setDiasProximoTratamientoPorLinea] = useState<Record<string, string>>({})

  useEffect(() => {
    if (atencion) return
    Promise.all([
      fetch('/api/clientes').then((res) => res.json()),
      fetch('/api/tratamientos').then((res) => res.json()),
      fetch('/api/usuarios/esteticistas').then((res) => res.json()),
      fetch('/api/citas').then((res) => res.json()),
      fetch('/api/ajustes').then((res) => res.json()),
    ]).then(([clientesData, tratamientosData, esteticistasData, citasData, configuracionData]) => {
      setClientes(Array.isArray(clientesData) ? clientesData : [])
      setTratamientos(Array.isArray(tratamientosData) ? tratamientosData.filter((t: Tratamiento) => t.activo) : [])
      setEsteticistas(Array.isArray(esteticistasData) ? esteticistasData : [])
      const horas = Math.max(1, Number((configuracionData as Configuracion).horasExpiracionCita) || 24)
      setHorasExpiracionCita(horas)
      setCitas(
        Array.isArray(citasData)
          ? citasData.filter((c: CitaPendiente) => Boolean(c.cliente) && !c.registrado && (c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA') && new Date(c.fecha).getTime() + horas * 60 * 60 * 1000 > Date.now())
          : []
      )
    })
  }, [atencion])

  useEffect(() => {
    if (!atencion) return
    fetch('/api/tratamientos').then((res) => res.json()).then((data) => setTratamientos(Array.isArray(data) ? data.filter((t: Tratamiento) => t.activo) : []))
    fetch('/api/usuarios/esteticistas').then((res) => res.json()).then((data) => setEsteticistas(Array.isArray(data) ? data : []))
    fetch('/api/productos').then((res) => res.json()).then((data) => setProductos(Array.isArray(data) ? data : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atencion?.id])

  const cargarProductosAtencion = () => {
    if (!atencion) return
    fetch(`/api/atenciones/${atencion.id}/productos`)
      .then((res) => res.json())
      .then((data) => setProductosAtencion(Array.isArray(data) ? data : []))
  }

  useEffect(() => {
    cargarProductosAtencion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atencion?.id])

  const seleccionarCita = (citaId: string) => {
    const cita = citas.find((c) => c.id === citaId)
    if (!cita?.cliente) return
    setForm((prev) => ({ ...prev, citaId, clienteId: cita.cliente!.id }))
    setClienteQuery(cita.cliente.nombre)
  }

  const clientesFiltrados = useMemo(() => {
    const query = clienteQuery.trim().toLowerCase()
    if (!query) return clientes.slice(0, 8)
    return clientes.filter((cliente) => cliente.nombre.toLowerCase().includes(query)).slice(0, 8)
  }, [clientes, clienteQuery])

  const tratamientosFiltrados = useMemo(() => {
    const query = tratamientoQuery.trim().toLowerCase()
    if (!query) return tratamientos.slice(0, 8)
    return tratamientos.filter((tratamiento) => tratamiento.nombre.toLowerCase().includes(query)).slice(0, 8)
  }, [tratamientos, tratamientoQuery])

  const iniciarAtencion = async () => {
    if (!form.clienteId || !form.tratamientoId || !form.esteticistaId) {
      setError('Selecciona cliente, tratamiento y esteticista')
      return
    }
    setSaving(true)
    setError('')
    const response = await fetch('/api/atenciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: form.clienteId,
        tratamientoId: form.tratamientoId,
        esteticistaId: form.esteticistaId,
        citaId: modo === 'cita' ? form.citaId || null : null,
        notas: form.notas || null,
        cabinaId: cabinaId || null,
        ...(puedeCambiarPrecio && form.precio !== '' ? { precio: Number(form.precio) } : {}),
      }),
    })
    setSaving(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo registrar la atención')
      return
    }
    toast.success('Atención registrada')
    onChanged()
  }

  const puedeGestionar = (linea: LineaTratamiento) => rol !== 'ESTETICISTA' || linea.esteticista.id === userId

  const cambiarEstadoLinea = async (linea: LineaTratamiento, accion: 'iniciar' | 'finalizar' | 'cancelar') => {
    if (!atencion) return
    setSaving(true)
    setError('')
    const diasProximoTratamiento = diasProximoTratamientoPorLinea[linea.id]
    const response = await fetch(`/api/atenciones/${atencion.id}/tratamientos/${linea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion,
        ...(accion === 'finalizar' && diasProximoTratamiento ? { diasProximoTratamiento: Number(diasProximoTratamiento) } : {}),
      }),
    })
    setSaving(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo actualizar el tratamiento')
      return
    }
    const mensajes = { iniciar: 'Tratamiento iniciado', finalizar: 'Tratamiento finalizado', cancelar: 'Tratamiento cancelado' }
    toast.success(mensajes[accion])
    onChanged()
  }

  const cancelarAtencionCompleta = async () => {
    if (!atencion) return
    setSaving(true)
    setError('')
    const response = await fetch(`/api/atenciones/${atencion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'cancelar' }),
    })
    setSaving(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo cancelar la atención')
      return
    }
    toast.success('Atención cancelada')
    onChanged()
  }

  const agregarItem = async () => {
    if (!atencion || !idNuevoItem) return

    if (tipoNuevoItem === 't') {
      if (!nuevoEsteticistaId) {
        setError('Selecciona la esteticista para el tratamiento')
        return
      }
      setAgregandoItem(true)
      setError('')
      const response = await fetch(`/api/atenciones/${atencion.id}/tratamientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tratamientoId: idNuevoItem,
          esteticistaId: nuevoEsteticistaId,
          ...(puedeCambiarPrecio && nuevoPrecio !== '' ? { precio: Number(nuevoPrecio) } : {}),
        }),
      })
      setAgregandoItem(false)
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'No se pudo agregar el tratamiento')
        return
      }
      setNuevoItemValue('')
      setNuevoEsteticistaId('')
      setNuevoPrecio('')
      toast.success('Tratamiento agregado')
      onChanged()
      return
    }

    if (nuevaCantidad <= 0) return
    setAgregandoItem(true)
    setError('')
    const response = await fetch(`/api/atenciones/${atencion.id}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productoId: idNuevoItem,
        cantidad: nuevaCantidad,
        ...(puedeCambiarPrecio && nuevoPrecio !== '' ? { precioUnit: Number(nuevoPrecio) } : {}),
      }),
    })
    setAgregandoItem(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo agregar el producto')
      return
    }
    setNuevoItemValue('')
    setNuevaCantidad(1)
    setNuevoPrecio('')
    cargarProductosAtencion()
    toast.success('Producto agregado')
  }

  if (!atencion) {
    return (
      <div className="space-y-6">
        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={() => setModo('walkin')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${modo === 'walkin' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Walk-in</button>
          <button type="button" onClick={() => setModo('cita')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${modo === 'cita' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Con cita existente</button>
        </div>

        {modo === 'cita' && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Cita agendada</label>
            <select value={form.citaId} onChange={(e) => seleccionarCita(e.target.value)} className="field mt-2">
              <option value="">Selecciona cita</option>
              {citas.map((cita) => (
                <option key={cita.id} value={cita.id}>
                  {new Date(cita.fecha).toLocaleString('es-PE')} · {cita.cliente?.nombre} · {cita.tratamiento}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700">Cliente</label>
          <input
            value={clienteQuery}
            onChange={(e) => {
              setClienteQuery(e.target.value)
              setForm((prev) => ({ ...prev, clienteId: '' }))
              setShowClienteDropdown(true)
            }}
            onFocus={() => setShowClienteDropdown(true)}
            onBlur={() => setTimeout(() => setShowClienteDropdown(false), 150)}
            autoComplete="off"
            placeholder="Busca un cliente por nombre"
            className="field mt-2"
          />
          {showClienteDropdown && clientesFiltrados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[#dfe8e0] bg-white shadow-lg">
              {clientesFiltrados.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onMouseDown={() => {
                    setForm((prev) => ({ ...prev, clienteId: cliente.id }))
                    setClienteQuery(cliente.nombre)
                    setShowClienteDropdown(false)
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#ecf8f2]"
                >
                  {cliente.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700">Tratamiento</label>
          <input
            value={tratamientoQuery}
            onChange={(e) => {
              setTratamientoQuery(e.target.value)
              setForm((prev) => ({ ...prev, tratamientoId: '' }))
              setShowTratamientoDropdown(true)
            }}
            onFocus={() => setShowTratamientoDropdown(true)}
            onBlur={() => setTimeout(() => setShowTratamientoDropdown(false), 150)}
            autoComplete="off"
            placeholder="Busca un tratamiento por nombre"
            className="field mt-2"
          />
          {showTratamientoDropdown && tratamientosFiltrados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[#dfe8e0] bg-white shadow-lg">
              {tratamientosFiltrados.map((tratamiento) => (
                <button
                  key={tratamiento.id}
                  type="button"
                  onMouseDown={() => {
                    setForm((prev) => ({ ...prev, tratamientoId: tratamiento.id, precio: String(tratamiento.precio) }))
                    setTratamientoQuery(tratamiento.nombre)
                    setShowTratamientoDropdown(false)
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-[#ecf8f2]"
                >
                  {tratamiento.nombre} · S/ {tratamiento.precio.toFixed(2)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Esteticista</label>
            <select value={form.esteticistaId} onChange={(e) => setForm((prev) => ({ ...prev, esteticistaId: e.target.value }))} className="field mt-2">
              <option value="">Selecciona esteticista</option>
              {esteticistas.map((esteticista) => (
                <option key={esteticista.id} value={esteticista.id}>{esteticista.name}</option>
              ))}
            </select>
          </div>
          {form.tratamientoId && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Precio</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.precio}
                disabled={!puedeCambiarPrecio}
                onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))}
                title={!puedeCambiarPrecio ? 'Solo un ADMIN o SUPERVISOR puede cambiar el precio de catálogo' : 'Precio acordado con el cliente'}
                className="field mt-2 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Notas (opcional)</label>
          <input value={form.notas} onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))} className="field mt-2" />
        </div>

        <button type="button" disabled={saving} onClick={() => void iniciarAtencion()} className="btn-brand w-full disabled:opacity-60">
          {saving ? 'Guardando...' : 'Registrar atención'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f5faf7] px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <ClienteHistorialLink
            clienteId={atencion.cliente.id}
            nombre={atencion.cliente.nombre}
            className="text-lg font-bold text-[#173d36] underline decoration-dotted underline-offset-2 hover:text-emerald-700"
          />
          <p className="text-sm text-slate-500">Visita iniciada a las {formatearHora(atencion.horaInicio)}</p>
        </div>
        <ClienteHistorialLink clienteId={atencion.cliente.id} nombre="Ver historial" className="text-xs font-semibold text-emerald-700 underline decoration-dotted underline-offset-2 hover:text-emerald-900" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {atencion.tratamientos.map((linea) => {
          const inactiva = linea.estado === 'CANCELADA' || linea.estado === 'FINALIZADA'
          return (
            <div key={linea.id} className={`rounded-2xl border border-slate-200 p-3 ${inactiva ? 'bg-slate-50/60' : 'bg-white'}`}>
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                    <span>Inicio <span className="font-semibold normal-case tracking-normal text-slate-600">{formatearHora(linea.horaInicio)}</span></span>
                    <span>Fin <span className="font-semibold normal-case tracking-normal text-slate-600">{formatearHora(linea.horaFin)}</span></span>
                    <span>Duración <span className="font-semibold normal-case tracking-normal text-slate-600">{calcularDuracion(linea)}</span></span>
                  </div>
                  <p className={`mt-1.5 font-semibold leading-snug ${inactiva ? 'text-slate-500' : 'text-[#173d36]'}`}>{linea.tratamiento.nombre}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{linea.esteticista.name}</p>
                  {linea.precio != null && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>S/ {linea.precio.toFixed(2)}</span>
                      {precioFueModificado(linea.precio, linea.precioCatalogo) && (
                        <span
                          title={`Precio de catálogo: S/ ${linea.precioCatalogo!.toFixed(2)}`}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                        >Precio modificado</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex w-28 shrink-0 flex-col gap-1.5">
                  <span className={`rounded-full px-3 py-1 text-center text-xs font-semibold ${estadoStyles[linea.estado]}`}>{estadoLabels[linea.estado]}</span>
                  {puedeGestionar(linea) && linea.estado === 'PENDIENTE' && (
                    <button type="button" disabled={saving} onClick={() => void cambiarEstadoLinea(linea, 'iniciar')} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60">Iniciar</button>
                  )}
                  {puedeGestionar(linea) && linea.estado === 'EN_CURSO' && (
                    <button type="button" disabled={saving} onClick={() => void cambiarEstadoLinea(linea, 'finalizar')} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60">Finalizar</button>
                  )}
                  {puedeGestionar(linea) && (linea.estado === 'PENDIENTE' || linea.estado === 'EN_CURSO') && (
                    <button type="button" disabled={saving} onClick={() => void cambiarEstadoLinea(linea, 'cancelar')} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">Cancelar</button>
                  )}
                </div>
              </div>

              {linea.estado === 'FINALIZADA' && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                  Próximo tratamiento sugerido: {linea.diasProximoTratamiento ? `${linea.diasProximoTratamiento} días` : 'sin valor'}
                </p>
              )}

              {puedeGestionar(linea) && linea.estado === 'EN_CURSO' && (
                <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                  <label className="whitespace-nowrap text-xs font-medium text-slate-700">Próx. tratamiento en (días)</label>
                  <input
                    type="number"
                    min={1}
                    value={diasProximoTratamientoPorLinea[linea.id] ?? (linea.tratamiento.diasProximoTratamiento ? String(linea.tratamiento.diasProximoTratamiento) : '')}
                    onChange={(e) => setDiasProximoTratamientoPorLinea((prev) => ({ ...prev, [linea.id]: e.target.value }))}
                    placeholder="Sin valor"
                    className="field !mt-0 w-20 !py-1 text-sm"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(rol === 'ADMIN' || rol === 'SUPERVISOR' || rol === 'ESTETICISTA') && (
        <div className="rounded-2xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-700">Agregar tratamiento o producto</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-[2]">
              <label className="block text-xs font-medium text-slate-700">Item</label>
              <select
                value={nuevoItemValue}
                onChange={(e) => {
                  const value = e.target.value
                  setNuevoItemValue(value)
                  setNuevoEsteticistaId('')
                  setNuevaCantidad(1)
                  const [tipo, id] = value ? (value.split(':') as [string, string]) : ['', '']
                  const precioCatalogo = tipo === 't'
                    ? tratamientos.find((t) => t.id === id)?.precio
                    : tipo === 'p'
                      ? productos.find((p) => p.id === id)?.precioVenta
                      : undefined
                  setNuevoPrecio(precioCatalogo != null ? String(precioCatalogo) : '')
                }}
                className="field !mt-1"
              >
                <option value="">Selecciona...</option>
                <optgroup label="Tratamientos">
                  {tratamientos.map((tratamiento) => (
                    <option key={tratamiento.id} value={`t:${tratamiento.id}`}>{tratamiento.nombre} · S/ {tratamiento.precio.toFixed(2)}</option>
                  ))}
                </optgroup>
                <optgroup label="Productos">
                  {productos.map((producto) => (
                    <option key={producto.id} value={`p:${producto.id}`}>{producto.nombre} · S/ {producto.precioVenta.toFixed(2)} · stock {producto.stock}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            {tipoNuevoItem === 't' && (
              <div className="min-w-[10rem] flex-1">
                <label className="block text-xs font-medium text-slate-700">Esteticista</label>
                <select value={nuevoEsteticistaId} onChange={(e) => setNuevoEsteticistaId(e.target.value)} className="field !mt-1">
                  <option value="">Selecciona</option>
                  {esteticistas.map((esteticista) => (
                    <option key={esteticista.id} value={esteticista.id}>{esteticista.name}</option>
                  ))}
                </select>
              </div>
            )}
            {tipoNuevoItem === 'p' && (
              <div className="w-20">
                <label className="block text-xs font-medium text-slate-700">Cant.</label>
                <input type="number" min={1} value={nuevaCantidad} onChange={(e) => setNuevaCantidad(Number(e.target.value) || 1)} className="field !mt-1" />
              </div>
            )}
            {idNuevoItem && (
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-700">Precio</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={nuevoPrecio}
                  disabled={!puedeCambiarPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  title={!puedeCambiarPrecio ? 'Solo un ADMIN o SUPERVISOR puede cambiar el precio de catálogo' : 'Precio acordado con el cliente'}
                  className="field !mt-1 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            )}
            <button
              type="button"
              disabled={agregandoItem || !idNuevoItem || (tipoNuevoItem === 't' && !nuevoEsteticistaId)}
              onClick={() => void agregarItem()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {agregandoItem ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <AtencionFotos atencionId={atencion.id} />

        <div className="rounded-3xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Productos agregados</p>
          <div className="mt-2 space-y-1.5">
            {productosAtencion.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                <span className="min-w-0 truncate">
                  {item.producto.nombre} × {item.cantidad}
                  {precioFueModificado(item.precioUnit, item.precioCatalogo) && (
                    <span
                      title={`Precio de catálogo: S/ ${item.precioCatalogo!.toFixed(2)}`}
                      className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                    >Precio modificado</span>
                  )}
                </span>
                <span className="shrink-0">S/ {(item.cantidad * item.precioUnit).toFixed(2)}</span>
              </div>
            ))}
            {productosAtencion.length === 0 && <p className="text-sm text-slate-500">Aún no se agregaron productos.</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button type="button" onClick={() => router.push(`/facturacion?clienteId=${atencion.cliente.id}`)} className="btn-brand flex-1">Ir a facturación</button>
        {(rol === 'ADMIN' || rol === 'SUPERVISOR') && (
          <button type="button" disabled={saving} onClick={() => void cancelarAtencionCompleta()} className="flex-1 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">Cancelar visita</button>
        )}
      </div>
    </div>
  )
}
