'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AtencionActual, CabinaEstado } from '@/components/CabinaCard'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'
import { AtencionFotos } from '@/components/AtencionFotos'

interface Cliente { id: string; nombre: string }
interface Tratamiento { id: string; nombre: string; activo: boolean }
interface Esteticista { id: string; name: string }
interface CitaPendiente { id: string; fecha: string; tratamiento: string; estado: string; registrado: boolean; cliente: Cliente }
interface Configuracion { horasExpiracionCita: number }
interface Producto { id: string; nombre: string; precioVenta: number; stock: number }
interface AtencionProductoItem { id: string; cantidad: number; precioUnit: number; producto: { id: string; nombre: string } }

interface CabinaDetalle {
  id: string
  nombre: string
  estado: CabinaEstado
  atencionActual: AtencionActual | null
}

interface CabinaAtencionPanelProps {
  cabina: CabinaDetalle
  onClose: () => void
  onChanged: () => void
}

const ESTADOS_MANUALES: CabinaEstado[] = ['DISPONIBLE', 'LIMPIEZA', 'MANTENIMIENTO']

export function CabinaAtencionPanel({ cabina, onClose, onChanged }: CabinaAtencionPanelProps) {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [esteticistas, setEsteticistas] = useState<Esteticista[]>([])
  const [citas, setCitas] = useState<CitaPendiente[]>([])
  const [horasExpiracionCita, setHorasExpiracionCita] = useState(24)
  const [modo, setModo] = useState<'walkin' | 'cita'>('walkin')
  const [form, setForm] = useState({ clienteId: '', tratamientoId: '', esteticistaId: '', citaId: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosAtencion, setProductosAtencion] = useState<AtencionProductoItem[]>([])
  const [nuevoProductoId, setNuevoProductoId] = useState('')
  const [nuevaCantidad, setNuevaCantidad] = useState(1)
  const [agregandoProducto, setAgregandoProducto] = useState(false)
  const [diasProximoTratamiento, setDiasProximoTratamiento] = useState(() =>
    cabina.atencionActual?.tratamiento.diasProximoTratamiento
      ? String(cabina.atencionActual.tratamiento.diasProximoTratamiento)
      : ''
  )

  const atencionId = cabina.atencionActual?.id

  const cargarProductosAtencion = () => {
    if (!atencionId) return
    fetch(`/api/atenciones/${atencionId}/productos`)
      .then((res) => res.json())
      .then((data) => setProductosAtencion(Array.isArray(data) ? data : []))
  }

  useEffect(() => {
    cargarProductosAtencion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atencionId])

  useEffect(() => {
    if (!atencionId) return
    fetch('/api/productos')
      .then((res) => res.json())
      .then((data) => setProductos(Array.isArray(data) ? data : []))
  }, [atencionId])

  const agregarProducto = async () => {
    if (!atencionId || !nuevoProductoId || nuevaCantidad <= 0) return
    setAgregandoProducto(true)
    setError('')
    const response = await fetch(`/api/atenciones/${atencionId}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productoId: nuevoProductoId, cantidad: nuevaCantidad }),
    })
    setAgregandoProducto(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo agregar el producto')
      return
    }
    setNuevoProductoId('')
    setNuevaCantidad(1)
    cargarProductosAtencion()
  }

  useEffect(() => {
    if (cabina.estado !== 'DISPONIBLE') return
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
      setHorasExpiracionCita(Math.max(1, Number((configuracionData as Configuracion).horasExpiracionCita) || 24))
      setCitas(
        Array.isArray(citasData)
          ? citasData.filter((c: CitaPendiente) => !c.registrado && (c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA') && new Date(c.fecha).getTime() + horasExpiracionCita * 60 * 60 * 1000 > Date.now())
          : []
      )
    })
  }, [cabina.estado, horasExpiracionCita])

  const seleccionarCita = (citaId: string) => {
    const cita = citas.find((c) => c.id === citaId)
    setForm((prev) => ({ ...prev, citaId, clienteId: cita?.cliente.id ?? prev.clienteId }))
  }

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
        cabinaId: cabina.id,
        clienteId: form.clienteId,
        tratamientoId: form.tratamientoId,
        esteticistaId: form.esteticistaId,
        citaId: modo === 'cita' ? form.citaId || null : null,
        notas: form.notas || null,
      }),
    })
    setSaving(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo iniciar la atención')
      return
    }
    onChanged()
  }

  const finalizarOCancelar = async (accion: 'finalizar' | 'cancelar') => {
    if (!cabina.atencionActual) return
    setSaving(true)
    setError('')
    const response = await fetch(`/api/atenciones/${cabina.atencionActual.id}`, {
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
      setError(data.error || 'No se pudo actualizar la atención')
      return
    }
    if (accion === 'finalizar') {
      router.push(`/facturacion?clienteId=${cabina.atencionActual.cliente.id}&atencionId=${cabina.atencionActual.id}`)
      return
    }
    onChanged()
  }

  const cambiarEstadoManual = async (estado: CabinaEstado) => {
    setSaving(true)
    setError('')
    const response = await fetch(`/api/cabinas/${cabina.id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    setSaving(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo cambiar el estado')
      return
    }
    onChanged()
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}

      {cabina.estado === 'ATENCION' && cabina.atencionActual && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-amber-900">{cabina.atencionActual.cliente.nombre}</p>
              <ClienteHistorialLink
                clienteId={cabina.atencionActual.cliente.id}
                nombre="Ver historial"
                className="text-xs font-semibold text-emerald-700 underline decoration-dotted underline-offset-2 hover:text-emerald-900"
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">{cabina.atencionActual.tratamiento.nombre}</p>
            <p className="mt-1 text-sm text-slate-600">Esteticista: {cabina.atencionActual.esteticista.name}</p>
            <p className="mt-1 text-sm text-slate-500">Desde {new Date(cabina.atencionActual.horaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {atencionId && <AtencionFotos atencionId={atencionId} />}

          <div className="rounded-3xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">Productos que el cliente desea llevar</p>
            <div className="mt-3 space-y-2">
              {productosAtencion.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{item.producto.nombre} × {item.cantidad}</span>
                  <span>S/ {(item.cantidad * item.precioUnit).toFixed(2)}</span>
                </div>
              ))}
              {productosAtencion.length === 0 && <p className="text-sm text-slate-500">Aún no se agregaron productos.</p>}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem] flex-1">
                <label className="block text-xs font-medium text-slate-700">Producto</label>
                <select value={nuevoProductoId} onChange={(e) => setNuevoProductoId(e.target.value)} className="field !mt-1">
                  <option value="">Selecciona producto</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>{producto.nombre} · S/ {producto.precioVenta.toFixed(2)} · stock {producto.stock}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-slate-700">Cantidad</label>
                <input type="number" min={1} value={nuevaCantidad} onChange={(e) => setNuevaCantidad(Number(e.target.value) || 1)} className="field !mt-1" />
              </div>
              <button type="button" disabled={agregandoProducto || !nuevoProductoId} onClick={() => void agregarProducto()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                {agregandoProducto ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Próximo tratamiento sugerido en (días)</label>
            <input
              type="number"
              min={1}
              value={diasProximoTratamiento}
              onChange={(e) => setDiasProximoTratamiento(e.target.value)}
              placeholder="Sin valor sugerido por el tratamiento"
              className="field mt-2"
            />
            <p className="mt-1 text-xs text-slate-500">
              {cabina.atencionActual.tratamiento.diasProximoTratamiento
                ? 'Precargado con el valor configurado en el tratamiento. Puedes modificarlo antes de finalizar.'
                : 'Este tratamiento no tiene un valor por defecto configurado.'}
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" disabled={saving} onClick={() => void finalizarOCancelar('finalizar')} className="btn-brand flex-1 disabled:opacity-60">Finalizar</button>
            <button type="button" disabled={saving} onClick={() => void finalizarOCancelar('cancelar')} className="flex-1 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">Cancelar</button>
          </div>
          <p className="text-xs text-slate-500">Al finalizar pasarás a facturación con el tratamiento y los productos agregados.</p>
        </div>
      )}

      {cabina.estado === 'DISPONIBLE' && (
        <div className="space-y-4">
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
                    {new Date(cita.fecha).toLocaleString('es-PE')} · {cita.cliente.nombre} · {cita.tratamiento}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Cliente</label>
            <select value={form.clienteId} onChange={(e) => setForm((prev) => ({ ...prev, clienteId: e.target.value }))} className="field mt-2">
              <option value="">Selecciona cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Tratamiento</label>
            <select value={form.tratamientoId} onChange={(e) => setForm((prev) => ({ ...prev, tratamientoId: e.target.value }))} className="field mt-2">
              <option value="">Selecciona tratamiento</option>
              {tratamientos.map((tratamiento) => (
                <option key={tratamiento.id} value={tratamiento.id}>{tratamiento.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Esteticista</label>
            <select value={form.esteticistaId} onChange={(e) => setForm((prev) => ({ ...prev, esteticistaId: e.target.value }))} className="field mt-2">
              <option value="">Selecciona esteticista</option>
              {esteticistas.map((esteticista) => (
                <option key={esteticista.id} value={esteticista.id}>{esteticista.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Notas (opcional)</label>
            <input value={form.notas} onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))} className="field mt-2" />
          </div>

          <button type="button" disabled={saving} onClick={() => void iniciarAtencion()} className="btn-brand w-full disabled:opacity-60">
            {saving ? 'Guardando...' : 'Iniciar atención'}
          </button>
        </div>
      )}

      {cabina.estado !== 'ATENCION' && (
        <div className="border-t border-slate-200 pt-5">
          <label className="block text-sm font-medium text-slate-700">Cambiar estado manualmente</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ESTADOS_MANUALES.filter((estado) => estado !== cabina.estado).map((estado) => (
              <button
                key={estado}
                type="button"
                disabled={saving}
                onClick={() => void cambiarEstadoManual(estado)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {estado === 'DISPONIBLE' ? 'Disponible' : estado === 'LIMPIEZA' ? 'Limpieza' : 'Mantenimiento'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
