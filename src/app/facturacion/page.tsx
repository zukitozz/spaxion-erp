'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

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

interface Descuento {
  id: string
  codigo: string
  tipo: 'PORCENTAJE' | 'FIJO'
  valor: number
  activo: boolean
}

interface FacturaItemForm {
  id: string
  productoId: string
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
  comprobante: string | null
  descuentoAplicado: number | null
  items: FacturaItem[]
  numeracionComprobante: string | null
}

interface PendienteProducto {
  id: string
  cantidad: number
  precioUnit: number
  producto: { id: string; nombre: string }
}

interface Pendiente {
  id: string
  horaInicio: string
  cabina: { id: string; nombre: string }
  tratamiento: { id: string; nombre: string; precio: number }
  esteticista: { id: string; name: string }
  productos: PendienteProducto[]
}

const createInitialItem = (): FacturaItemForm => ({ id: crypto.randomUUID(), productoId: '', nombre: '', cantidad: 1, precioUnit: 0 })

const totalPendiente = (pendiente: Pendiente) =>
  pendiente.tratamiento.precio + pendiente.productos.reduce((sum, item) => sum + item.cantidad * item.precioUnit, 0)

function FacturacionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [atencionIdOrigen] = useState(() => searchParams.get('atencionId') || '')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [descuentos, setDescuentos] = useState<Descuento[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [guardandoPendiente, setGuardandoPendiente] = useState(false)

  const [form, setForm] = useState({
    clienteId: searchParams.get('clienteId') || '',
    tipo: 'BOLETA',
    metodoPago: 'EFECTIVO',
    descuentoId: '',
    items: [createInitialItem()],
  })

  const [clienteQuery, setClienteQuery] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [nuevoClienteAbierto, setNuevoClienteAbierto] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', tipoDocumento: 'DNI' as 'DNI' | 'RUC', numeroDocumento: '' })
  const [creandoCliente, setCreandoCliente] = useState(false)

  const itemsValidos = useMemo(() => form.items.filter((item) => item.productoId), [form.items])

  const subtotalPendientes = useMemo(() => pendientes.reduce((sum, pendiente) => sum + totalPendiente(pendiente), 0), [pendientes])
  const subtotalManual = useMemo(
    () => itemsValidos.reduce((sum, item) => sum + item.cantidad * item.precioUnit, 0),
    [itemsValidos],
  )
  const subtotal = subtotalPendientes + subtotalManual

  const descuento = useMemo(() => {
    const selected = descuentos.find((item) => item.id === form.descuentoId && item.activo)
    if (!selected) return 0
    return selected.tipo === 'PORCENTAJE'
      ? (subtotal * selected.valor) / 100
      : selected.valor
  }, [descuentos, form.descuentoId, subtotal])

  const total = Math.max(0, subtotal - descuento)

  const clientesFiltrados = useMemo(() => {
    const query = clienteQuery.trim().toLowerCase()
    if (!query) return []
    return clientes.filter((cliente) => cliente.nombre.toLowerCase().includes(query)).slice(0, 8)
  }, [clientes, clienteQuery])

  const recentInvoices = loading ? (
    <p className="text-sm text-slate-500">Cargando facturas...</p>
  ) : facturas.length === 0 ? (
    <p className="text-sm text-slate-500">No hay facturas registradas todavía.</p>
  ) : (
    facturas.map((factura) => (
      <div key={factura.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              <ClienteHistorialLink clienteId={factura.cliente.id} nombre={factura.cliente.nombre} className="hover:text-emerald-700" />
            </p>
            <p className="text-sm text-slate-500">{factura.tipo} · {factura.metodoPago}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900">S/ {factura.total.toFixed(2)}</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">{factura.estado} · {factura.numeracionComprobante || factura.comprobante || 'Sin comprobante'}</p>
        <div className="mt-3 grid gap-2 text-sm text-slate-500">
          {(Array.isArray(factura.items) ? factura.items : []).map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span>{item.nombre}</span>
              <span>S/ {item.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    ))
  )

  const loadData = async () => {
    const [clientesRes, productosRes, descuentosRes, facturasRes] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/productos'),
      fetch('/api/descuentos'),
      fetch('/api/facturacion'),
    ])

    const [clientesData, productosData, descuentosData, facturasData] = await Promise.all([
      clientesRes.json(),
      productosRes.json(),
      descuentosRes.json(),
      facturasRes.json(),
    ])

    setClientes(Array.isArray(clientesData) ? clientesData : [])
    setProductos(Array.isArray(productosData) ? productosData : [])
    setDescuentos(Array.isArray(descuentosData) ? descuentosData.filter((item: Descuento) => item.activo) : [])
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
      alert(data.error || 'No se pudo registrar el cliente')
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
      alert('No se encontró el cliente "Clientes Varios". Contacta a soporte.')
    }
  }

  const updateItem = (index: number, changes: Partial<FacturaItemForm>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, ...changes } : item)),
    }))
  }

  const selectProduct = (index: number, productoId: string) => {
    const producto = productos.find((item) => item.id === productoId)
    updateItem(index, { productoId, nombre: producto?.nombre || '', precioUnit: producto?.precioVenta || 0 })
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
      descuentoId: '',
      items: [createInitialItem()],
    })
    setClienteQuery('')
    setNuevoClienteAbierto(false)
    setNuevoCliente({ nombre: '', tipoDocumento: 'DNI', numeroDocumento: '' })
  }

  const handleSubmit = async () => {
    if (!form.clienteId) return
    if (pendientes.length === 0 && itemsValidos.length === 0) return
    setSubmitting(true)

    await fetch('/api/facturacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: form.clienteId,
        atencionIds: pendientes.map((pendiente) => pendiente.id),
        tipo: form.tipo,
        metodoPago: form.metodoPago,
        descuentoId: form.descuentoId || null,
        items: itemsValidos,
      }),
    })

    resetForm()
    await loadData()
    setSubmitting(false)
  }

  const handleGuardarPendiente = async () => {
    const atencionDestino = atencionIdOrigen || pendientes[0]?.id
    if (!atencionDestino) return
    setGuardandoPendiente(true)

    for (const item of itemsValidos) {
      const response = await fetch(`/api/atenciones/${atencionDestino}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: item.productoId, cantidad: item.cantidad }),
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'No se pudo guardar un producto pendiente')
        setGuardandoPendiente(false)
        return
      }
    }

    setGuardandoPendiente(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Facturación</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900">Cobros y comprobantes</h1>
          <p className="mt-2 text-slate-600">Registra ventas, aplica descuentos y genera comprobantes con métodos de pago.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Nueva factura</h2>
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
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                      className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
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
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-900">{pendiente.tratamiento.nombre}</span>
                          <span className="text-slate-600">S/ {pendiente.tratamiento.precio.toFixed(2)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(pendiente.horaInicio).toLocaleString('es-PE')} · Cabina {pendiente.cabina.nombre} · {pendiente.esteticista.name}
                        </p>
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
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                          <label htmlFor={`factura-item-${item.id}-producto`} className="block text-sm font-medium text-slate-700">Producto</label>
                          <select id={`factura-item-${item.id}-producto`} value={item.productoId} onChange={(event) => selectProduct(index, event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                            <option value="">Servicio / item manual</option>
                            {productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} · stock {producto.stock}</option>)}
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
                            className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                            className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                    <label htmlFor="factura-descuento" className="text-sm font-medium text-slate-700">Descuento</label>
                    {form.descuentoId && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, descuentoId: '' }))}
                        className="text-xs font-semibold text-emerald-700"
                      >Quitar</button>
                    )}
                  </div>
                  <select
                    id="factura-descuento"
                    value={form.descuentoId}
                    onChange={(event) => setForm((prev) => ({ ...prev, descuentoId: event.target.value }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Sin descuento</option>
                    {descuentos.map((descuento) => (
                      <option key={descuento.id} value={descuento.id}>
                        {descuento.codigo} · {descuento.tipo === 'PORCENTAJE' ? `${descuento.valor}%` : `S/ ${descuento.valor.toFixed(2)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Total descuento</span>
                  <span>- S/ {descuento.toFixed(2)}</span>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-4 text-lg font-semibold text-emerald-900 flex items-center justify-between">
                  <span>Total</span>
                  <span>S/ {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting || !form.clienteId || subtotal === 0}
                  onClick={() => void handleSubmit()}
                  className="btn-brand flex-1 disabled:opacity-60"
                >
                  {submitting ? 'Registrando...' : 'Cobrar y emitir comprobante'}
                </button>
                {(pendientes.length > 0 || atencionIdOrigen) && (
                  <button
                    type="button"
                    disabled={guardandoPendiente}
                    onClick={() => void handleGuardarPendiente()}
                    className="flex-1 rounded-xl border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
                  >
                    {guardandoPendiente ? 'Guardando...' : 'Guardar como pendiente (otro tratamiento)'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card-surface">
            <h2 className="text-xl font-semibold text-emerald-900">Facturas recientes</h2>
            <div className="mt-6 space-y-4">
              {recentInvoices}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FacturacionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <FacturacionContent />
    </Suspense>
  )
}
