'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'

const FACTURAS_PAGE_SIZE = 10

interface Cliente {
  id: string
  nombre: string
  dni?: string | null
}

interface Producto {
  id: string
  nombre: string
  precioVenta: number
  stock: number
}

interface Tratamiento {
  id: string
  nombre: string
  precio: number
  activo: boolean
}

interface FacturaItemForm {
  id: string
  productoId: string
  tratamientoId: string
  nombre: string
  cantidad: number
  precioUnit: number
}

interface FacturaItem {
  id: string
  nombre: string
  cantidad: number
  precioUnit: number
  total: number
}

interface Factura {
  id: string
  cliente: Cliente
  tipo: 'BOLETA' | 'FACTURA' | 'NOTA_VENTA'
  total: number
  metodoPago: string
  estado: string
  descuentoAplicado: number | null
  items: FacturaItem[]
  numeracionComprobante: string | null
  enviado: boolean
  errors: string | null
  url: string | null
  fechaHora: string | null
}

interface PendienteProducto {
  id: string
  cantidad: number
  precioUnit: number
  producto: { id: string; nombre: string }
}

interface PendienteTratamiento {
  id: string
  nombre: string
  precio: number
}

interface Pendiente {
  id: string
  horaInicio: string
  cabina: { id: string; nombre: string } | null
  tratamientos: PendienteTratamiento[]
  productos: PendienteProducto[]
}

const createInitialItem = (): FacturaItemForm => ({ id: crypto.randomUUID(), productoId: '', tratamientoId: '', nombre: '', cantidad: 1, precioUnit: 0 })

const totalPendiente = (pendiente: Pendiente) =>
  pendiente.tratamientos.reduce((sum, item) => sum + item.precio, 0) +
  pendiente.productos.reduce((sum, item) => sum + item.cantidad * item.precioUnit, 0)

function FacturacionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [atencionIdOrigen] = useState(() => searchParams.get('atencionId') || '')
  const [mostrarFormulario, setMostrarFormulario] = useState(
    () => Boolean(searchParams.get('atencionId') || searchParams.get('clienteId')),
  )

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [guardandoPendiente, setGuardandoPendiente] = useState(false)

  const [form, setForm] = useState({
    clienteId: searchParams.get('clienteId') || '',
    tipo: 'BOLETA',
    metodoPago: 'EFECTIVO',
    items: [createInitialItem()],
  })
  const [descuentoInput, setDescuentoInput] = useState('')
  const [busquedaFactura, setBusquedaFactura] = useState('')
  const [paginaFactura, setPaginaFactura] = useState(1)

  const [clienteQuery, setClienteQuery] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [nuevoClienteAbierto, setNuevoClienteAbierto] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', tipoDocumento: 'DNI' as 'DNI' | 'RUC', numeroDocumento: '' })
  const [creandoCliente, setCreandoCliente] = useState(false)

  const itemsValidos = useMemo(() => form.items.filter((item) => item.productoId || item.tratamientoId), [form.items])

  const subtotalPendientes = useMemo(() => pendientes.reduce((sum, pendiente) => sum + totalPendiente(pendiente), 0), [pendientes])
  const subtotalManual = useMemo(
    () => itemsValidos.reduce((sum, item) => sum + item.cantidad * item.precioUnit, 0),
    [itemsValidos],
  )
  const subtotal = subtotalPendientes + subtotalManual

  const montoDescuento = useMemo(() => {
    const valor = Math.max(0, Number(descuentoInput) || 0)
    return Math.min(Math.round(valor * 100) / 100, subtotal)
  }, [descuentoInput, subtotal])

  const total = Math.max(0, subtotal - montoDescuento)

  const clientesFiltrados = useMemo(() => {
    const query = clienteQuery.trim().toLowerCase()
    if (!query) return []
    return clientes.filter((cliente) => cliente.nombre.toLowerCase().includes(query)).slice(0, 8)
  }, [clientes, clienteQuery])

  const facturasFiltradas = useMemo(() => {
    const query = busquedaFactura.trim().toLowerCase()
    if (!query) return facturas
    return facturas.filter((factura) =>
      (factura.numeracionComprobante || '').toLowerCase().includes(query) ||
      factura.cliente.nombre.toLowerCase().includes(query),
    )
  }, [facturas, busquedaFactura])

  const totalPaginasFactura = Math.max(1, Math.ceil(facturasFiltradas.length / FACTURAS_PAGE_SIZE))
  const paginaFacturaActual = Math.min(paginaFactura, totalPaginasFactura)
  const facturasPagina = facturasFiltradas.slice(
    (paginaFacturaActual - 1) * FACTURAS_PAGE_SIZE,
    paginaFacturaActual * FACTURAS_PAGE_SIZE,
  )

  useEffect(() => { setPaginaFactura(1) }, [busquedaFactura])

  const recentInvoices = loading ? (
    <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando facturas...</p>
  ) : facturasPagina.length === 0 ? (
    <p className="text-sm text-slate-500">{facturas.length === 0 ? 'No hay facturas registradas todavía.' : 'No se encontraron facturas.'}</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="pb-3 pr-4">Fecha y hora</th>
            <th className="pb-3 pr-4">Cliente</th>
            <th className="pb-3 pr-4">Tipo</th>
            <th className="pb-3 pr-4">Comprobante</th>
            <th className="pb-3 pr-4 text-right">Total</th>
            <th className="pb-3 pr-4">Estado</th>
            <th className="pb-3">Acción</th>
          </tr>
        </thead>
        <tbody>
          {facturasPagina.map((factura) => (
            <tr key={factura.id} className="border-t border-[#eef1ec]">
              <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                {factura.fechaHora ? new Date(factura.fechaHora).toLocaleString('es-PE') : '—'}
              </td>
              <td className="py-3 pr-4 font-semibold text-[#173d36]">
                <ClienteHistorialLink clienteId={factura.cliente.id} nombre={factura.cliente.nombre} className="hover:text-emerald-700" />
              </td>
              <td className="py-3 pr-4 text-slate-600">{factura.tipo}</td>
              <td className="py-3 pr-4 text-slate-600">{factura.numeracionComprobante || 'Sin comprobante'}</td>
              <td className="py-3 pr-4 text-right font-semibold text-[#173d36]">S/ {factura.total.toFixed(2)}</td>
              <td className="py-3 pr-4">
                {factura.tipo === 'NOTA_VENTA' ? (
                  <span className="text-slate-500">No aplica</span>
                ) : factura.enviado ? (
                  <span className="font-semibold text-[#1d6f50]">✓ Enviado a SUNAT</span>
                ) : (
                  <span className="font-semibold text-rose-700">Error al enviar</span>
                )}
                {factura.errors && !factura.enviado && (
                  <p className="mt-1 max-w-xs text-xs text-rose-700">{factura.errors}</p>
                )}
              </td>
              <td className="py-3">
                {factura.enviado && factura.url ? (
                  <a href={factura.url} target="_blank" rel="noreferrer" className="rounded-full border border-[#00483f] px-4 py-1.5 text-xs font-bold text-[#00483f] transition hover:bg-[#00483f] hover:text-white">
                    Ver PDF
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const loadData = async () => {
    const [clientesRes, productosRes, tratamientosRes, facturasRes] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/productos'),
      fetch('/api/tratamientos'),
      fetch('/api/facturacion'),
    ])

    const [clientesData, productosData, tratamientosData, facturasData] = await Promise.all([
      clientesRes.json(),
      productosRes.json(),
      tratamientosRes.json(),
      facturasRes.json(),
    ])

    setClientes(Array.isArray(clientesData) ? clientesData : [])
    setProductos(Array.isArray(productosData) ? productosData : [])
    setTratamientos(Array.isArray(tratamientosData) ? tratamientosData.filter((t: Tratamiento) => t.activo) : [])
    setFacturas(Array.isArray(facturasData) ? facturasData : [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!form.clienteId) {
      setPendientes([])
      return
    }
    fetch(`/api/clientes/${form.clienteId}/pendientes`)
      .then((res) => res.json())
      .then((data) => setPendientes(Array.isArray(data) ? data : []))
  }, [form.clienteId])

  useEffect(() => {
    if (!form.clienteId || clienteQuery) return
    const match = clientes.find((cliente) => cliente.id === form.clienteId)
    if (match) setClienteQuery(match.nombre)
  }, [clientes, form.clienteId, clienteQuery])

  const seleccionarCliente = (cliente: Cliente) => {
    setForm((prev) => ({ ...prev, clienteId: cliente.id }))
    setClienteQuery(cliente.nombre)
    setShowClienteDropdown(false)
    setNuevoClienteAbierto(false)
  }

  const handleClienteQueryChange = (value: string) => {
    setClienteQuery(value)
    setShowClienteDropdown(true)
    setNuevoClienteAbierto(false)
    if (form.clienteId) setForm((prev) => ({ ...prev, clienteId: '' }))
  }

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.numeroDocumento.trim()) return
    setCreandoCliente(true)
    const response = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nuevoCliente.nombre,
        dni: nuevoCliente.tipoDocumento === 'DNI' ? nuevoCliente.numeroDocumento : null,
        ruc: nuevoCliente.tipoDocumento === 'RUC' ? nuevoCliente.numeroDocumento : null,
      }),
    })
    const data = await response.json()
    setCreandoCliente(false)

    if (!response.ok) {
      toast.error(data.error || 'No se pudo registrar el cliente')
      return
    }

    setClientes((prev) => [data, ...prev])
    seleccionarCliente(data)
  }

  const handleSeleccionarClienteVarios = () => {
    const clienteVarios = clientes.find((cliente) => cliente.dni === '0')
    if (clienteVarios) {
      seleccionarCliente(clienteVarios)
    } else {
      toast.error('No se encontró el cliente "Clientes Varios". Contacta a soporte.')
    }
  }

  const updateItem = (index: number, changes: Partial<FacturaItemForm>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, ...changes } : item)),
    }))
  }

  const selectItem = (index: number, value: string) => {
    if (!value) {
      updateItem(index, { productoId: '', tratamientoId: '', nombre: '', precioUnit: 0 })
      return
    }
    const [tipo, id] = value.split(':')
    if (tipo === 'p') {
      const producto = productos.find((item) => item.id === id)
      updateItem(index, { productoId: id, tratamientoId: '', nombre: producto?.nombre || '', precioUnit: producto?.precioVenta || 0 })
    } else {
      const tratamiento = tratamientos.find((item) => item.id === id)
      updateItem(index, { productoId: '', tratamientoId: id, nombre: tratamiento?.nombre || '', precioUnit: tratamiento?.precio || 0 })
    }
  }

  const handleAddItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, createInitialItem()] }))
  }

  const handleRemoveItem = (index: number) => {
    setForm((current) => ({ ...current, items: current.items.filter((_, idx) => idx !== index) }))
  }

  const resetForm = () => {
    setForm({
      clienteId: '',
      tipo: 'BOLETA',
      metodoPago: 'EFECTIVO',
      items: [createInitialItem()],
    })
    setDescuentoInput('')
    setClienteQuery('')
    setNuevoClienteAbierto(false)
    setNuevoCliente({ nombre: '', tipoDocumento: 'DNI', numeroDocumento: '' })
  }

  const handleSubmit = async () => {
    if (!form.clienteId) return
    if (pendientes.length === 0 && itemsValidos.length === 0) return
    setSubmitting(true)

    const response = await fetch('/api/facturacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: form.clienteId,
        tratamientoLineIds: pendientes.flatMap((pendiente) => pendiente.tratamientos.map((t) => t.id)),
        productoLineIds: pendientes.flatMap((pendiente) => pendiente.productos.map((p) => p.id)),
        tipo: form.tipo,
        metodoPago: form.metodoPago,
        montoDescuento,
        items: itemsValidos,
      }),
    })
    const data = await response.json().catch(() => null)
    setSubmitting(false)

    if (!response.ok) {
      toast.error(data?.error || 'No se pudo registrar la factura')
      return
    }

    resetForm()
    setMostrarFormulario(false)
    await loadData()

    if (data?.tipo !== 'NOTA_VENTA' && !data?.enviado) {
      toast.error(data?.errors || 'La factura se registró, pero falló el envío a SUNAT')
    } else {
      toast.success('Factura registrada correctamente')
    }
  }

  const handleGuardarPendiente = async () => {
    const atencionDestino = atencionIdOrigen || pendientes[0]?.id
    if (!atencionDestino) return
    setGuardandoPendiente(true)

    for (const item of itemsValidos.filter((item) => item.productoId)) {
      const response = await fetch(`/api/atenciones/${atencionDestino}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: item.productoId, cantidad: item.cantidad }),
      })
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'No se pudo guardar un producto pendiente')
        setGuardandoPendiente(false)
        return
      }
    }

    setGuardandoPendiente(false)
    router.push('/dashboard')
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Facturación</p>
          <h1 className="page-heading mt-3 text-3xl">Cobros y comprobantes</h1>
          <p className="mt-2 text-slate-600">Registra ventas, aplica descuentos y genera comprobantes con métodos de pago.</p>
        </div>

        <div className="grid gap-6">
          {mostrarFormulario && (
            <div
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
            >
              <div className="card-surface w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-[#173d36]">Nueva factura</h2>
                  <button
                    type="button"
                    onClick={() => setMostrarFormulario(false)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Cerrar"
                  >✕</button>
                </div>
            <div className="mt-6 space-y-4">
              <div className="relative">
                <label htmlFor="factura-cliente" className="block text-sm font-medium text-slate-700">Cliente</label>
                <input
                  id="factura-cliente"
                  value={clienteQuery}
                  onChange={(event) => handleClienteQueryChange(event.target.value)}
                  onFocus={() => setShowClienteDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClienteDropdown(false), 150)}
                  autoComplete="off"
                  placeholder="Escribe el nombre del cliente"
                  className="field mt-2"
                />
                {showClienteDropdown && clienteQuery.trim() && !form.clienteId && (
                  <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onMouseDown={() => seleccionarCliente(cliente)}
                          className="block w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50"
                        >
                          {cliente.nombre}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onMouseDown={() => {
                          setNuevoCliente({ nombre: clienteQuery.trim(), tipoDocumento: 'DNI', numeroDocumento: '' })
                          setNuevoClienteAbierto(true)
                          setShowClienteDropdown(false)
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        No se encontró &quot;{clienteQuery.trim()}&quot; · Registrar nuevo cliente
                      </button>
                    )}
                  </div>
                )}
                {!form.clienteId && (
                  <button
                    type="button"
                    onMouseDown={handleSeleccionarClienteVarios}
                    className="mt-2 text-xs font-semibold text-slate-500 hover:text-emerald-700"
                  >Cliente no desea identificarse · Usar &quot;Clientes Varios&quot;</button>
                )}
              </div>

              {nuevoClienteAbierto && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Registrar nuevo cliente</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input
                      value={nuevoCliente.nombre}
                      onChange={(event) => setNuevoCliente((prev) => ({ ...prev, nombre: event.target.value }))}
                      placeholder="Nombre completo"
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm">
                      <button
                        type="button"
                        onClick={() => setNuevoCliente((prev) => ({ ...prev, tipoDocumento: 'DNI' }))}
                        className={`flex-1 px-3 py-2.5 font-semibold ${nuevoCliente.tipoDocumento === 'DNI' ? 'bg-emerald-700 text-white' : 'text-slate-500'}`}
                      >DNI</button>
                      <button
                        type="button"
                        onClick={() => setNuevoCliente((prev) => ({ ...prev, tipoDocumento: 'RUC' }))}
                        className={`flex-1 px-3 py-2.5 font-semibold ${nuevoCliente.tipoDocumento === 'RUC' ? 'bg-emerald-700 text-white' : 'text-slate-500'}`}
                      >RUC</button>
                    </div>
                    <input
                      value={nuevoCliente.numeroDocumento}
                      onChange={(event) => setNuevoCliente((prev) => ({ ...prev, numeroDocumento: event.target.value }))}
                      placeholder={nuevoCliente.tipoDocumento === 'DNI' ? 'Número de DNI' : 'Número de RUC'}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      disabled={creandoCliente || !nuevoCliente.nombre.trim() || !nuevoCliente.numeroDocumento.trim()}
                      onClick={() => void handleCrearCliente()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {creandoCliente && <Spinner />}
                      {creandoCliente ? 'Registrando...' : 'Registrar y seleccionar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNuevoClienteAbierto(false)}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                    >Cancelar</button>
                  </div>
                </div>
              )}

              {pendientes.length > 0 && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Pendientes de cobro de este cliente</p>
                  <div className="mt-3 space-y-3">
                    {pendientes.map((pendiente) => (
                      <div key={pendiente.id} className="rounded-2xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          {new Date(pendiente.horaInicio).toLocaleString('es-PE')}
                          {pendiente.cabina ? ` · Cabina ${pendiente.cabina.nombre}` : ''}
                        </p>
                        {pendiente.tratamientos.map((item) => (
                          <div key={item.id} className="mt-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-900">{item.nombre}</span>
                            <span className="text-slate-600">S/ {item.precio.toFixed(2)}</span>
                          </div>
                        ))}
                        {pendiente.productos.map((item) => (
                          <div key={item.id} className="mt-2 flex items-center justify-between text-xs text-slate-500">
                            <span>{item.producto.nombre} × {item.cantidad}</span>
                            <span>S/ {(item.cantidad * item.precioUnit).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm font-semibold text-amber-900">
                    <span>Total pendiente</span>
                    <span>S/ {subtotalPendientes.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="factura-tipo" className="block text-sm font-medium text-slate-700">Tipo</label>
                  <select
                    id="factura-tipo"
                    value={form.tipo}
                    onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                    className="field mt-2"
                  >
                    <option value="BOLETA">Boleta</option>
                    <option value="FACTURA">Factura</option>
                    <option value="NOTA_VENTA">Nota de venta (no se envía a SUNAT)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="factura-metodo-pago" className="block text-sm font-medium text-slate-700">Método de pago</label>
                  <select
                    id="factura-metodo-pago"
                    value={form.metodoPago}
                    onChange={(event) => setForm((prev) => ({ ...prev, metodoPago: event.target.value }))}
                    className="field mt-2"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="YAPE">Yape</option>
                    <option value="PLIN">Plin</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="DEPOSITO">Depósito en cuenta</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Productos adicionales</p>
                <div className="mt-3 space-y-4">
                  {form.items.map((item, index) => (
                    <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 sm:grid-cols-[1.2fr_0.9fr_0.9fr]">
                        <div>
                          <label htmlFor={`factura-item-${item.id}-producto`} className="block text-sm font-medium text-slate-700">Producto o tratamiento</label>
                          <select
                            id={`factura-item-${item.id}-producto`}
                            value={item.productoId ? `p:${item.productoId}` : item.tratamientoId ? `t:${item.tratamientoId}` : ''}
                            onChange={(event) => selectItem(index, event.target.value)}
                            className="field mt-2 bg-white"
                          >
                            <option value="">Item manual</option>
                            <optgroup label="Productos">
                              {productos.map((producto) => <option key={producto.id} value={`p:${producto.id}`}>{producto.nombre} · stock {producto.stock}</option>)}
                            </optgroup>
                            <optgroup label="Tratamientos">
                              {tratamientos.map((tratamiento) => <option key={tratamiento.id} value={`t:${tratamiento.id}`}>{tratamiento.nombre}</option>)}
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`factura-item-${item.id}-cantidad`} className="block text-sm font-medium text-slate-700">Cantidad</label>
                          <input
                            id={`factura-item-${item.id}-cantidad`}
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(event) => updateItem(index, { cantidad: Number(event.target.value) || 1 })}
                            className="field mt-2 bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor={`factura-item-${item.id}-precio`} className="block text-sm font-medium text-slate-700">Precio unitario</label>
                          <input
                            id={`factura-item-${item.id}-precio`}
                            type="number"
                            min={0}
                            value={item.precioUnit}
                            onChange={(event) => updateItem(index, { precioUnit: Number(event.target.value) || 0 })}
                            className="field mt-2 bg-white"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-500">
                        <p>Total: S/ {(item.cantidad * item.precioUnit).toFixed(2)}</p>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-600 underline"
                          >Eliminar</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
              >Agregar otro item</button>

              <div className="rounded-3xl bg-slate-50 p-5">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>S/ {subtotal.toFixed(2)}</span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="factura-descuento" className="text-sm font-medium text-slate-700">Monto a descontar</label>
                    {descuentoInput && (
                      <button
                        type="button"
                        onClick={() => setDescuentoInput('')}
                        className="text-xs font-semibold text-emerald-700"
                      >Quitar</button>
                    )}
                  </div>
                  <input
                    id="factura-descuento"
                    type="number"
                    min={0}
                    step="0.01"
                    value={descuentoInput}
                    onChange={(event) => setDescuentoInput(event.target.value)}
                    placeholder="S/ 0.00"
                    className="field mt-2 bg-white"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Total descuento</span>
                  <span>- S/ {montoDescuento.toFixed(2)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#dfe8e0] pt-4">
                  <span className="text-[15px] font-extrabold text-[#173d36]">Total</span>
                  <span className="page-heading text-2xl">S/ {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting || !form.clienteId || subtotal === 0}
                  onClick={() => void handleSubmit()}
                  className="btn-brand flex flex-1 items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Spinner />}
                  {submitting ? 'Registrando...' : 'Cobrar y emitir comprobante'}
                </button>
                {(pendientes.length > 0 || atencionIdOrigen) && (
                  <button
                    type="button"
                    disabled={guardandoPendiente}
                    onClick={() => void handleGuardarPendiente()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
                  >
                    {guardandoPendiente && <Spinner />}
                    {guardandoPendiente ? 'Guardando...' : 'Guardar como pendiente (otro tratamiento)'}
                  </button>
                )}
              </div>
            </div>
              </div>
            </div>
          )}

          <div className="card-surface">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[#173d36]">Facturas recientes</h2>
              <button
                type="button"
                onClick={() => setMostrarFormulario(true)}
                className="rounded-full bg-[#00483f] px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
              >
                + Nueva factura
              </button>
            </div>

            <input
              value={busquedaFactura}
              onChange={(event) => setBusquedaFactura(event.target.value)}
              placeholder="Buscar por número de comprobante o cliente..."
              className="field mt-4"
            />

            <div className="mt-6 space-y-4">
              {recentInvoices}
            </div>

            <Pagination page={paginaFacturaActual} totalPages={totalPaginasFactura} onChange={setPaginaFactura} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FacturacionPage() {
  return (
    <Suspense fallback={<div className="page-shell" />}>
      <FacturacionContent />
    </Suspense>
  )
}
