'use client'

import { Fragment, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'
import { imprimirTicket, puedeImprimirTicket, type TicketEmpresaInfo } from '@/lib/ticket'

const FACTURAS_PAGE_SIZE = 10

interface Cliente {
  id: string
  nombre: string
  dni?: string | null
  ruc?: string | null
  carnetExtranjeria?: string | null
  razonSocial?: string | null
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
  precioCatalogo: number | null
}

interface Factura {
  id: string
  cliente: Cliente
  tipo: 'BOLETA' | 'FACTURA' | 'NOTA_VENTA'
  total: number
  metodoPago: string
  estado: string
  items: FacturaItem[]
  numeracionComprobante: string | null
  enviado: boolean
  errors: string | null
  url: string | null
  fechaHora: string | null
  montoLetras: string | null
  gravadas: number | null
  igv: number | null
}

interface PendienteProducto {
  id: string
  cantidad: number
  precioUnit: number
  precioCatalogo: number
  producto: { id: string; nombre: string }
}

interface PendienteTratamiento {
  id: string
  nombre: string
  precio: number
  precioCatalogo: number
}

interface Pendiente {
  id: string
  horaInicio: string
  cabina: { id: string; nombre: string } | null
  tratamientos: PendienteTratamiento[]
  productos: PendienteProducto[]
}

const createInitialItem = (): FacturaItemForm => ({ id: crypto.randomUUID(), productoId: '', tratamientoId: '', nombre: '', cantidad: 1, precioUnit: 0 })

/** true si el precio acordado difiere del precio de catálogo (no es un descuento, es un cambio de precio base). */
function precioFueModificado(precio: number, precioCatalogo: number) {
  return Math.abs(precio - precioCatalogo) > 0.005
}

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
  const [empresa, setEmpresa] = useState<TicketEmpresaInfo>({ nombreEmpresa: 'Spaxión Centro Estético' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [guardandoPendiente, setGuardandoPendiente] = useState(false)

  const [form, setForm] = useState({
    clienteId: searchParams.get('clienteId') || '',
    tipo: 'BOLETA',
    metodoPago: 'EFECTIVO',
    items: [createInitialItem()],
  })
  const [busquedaFactura, setBusquedaFactura] = useState('')
  const [paginaFactura, setPaginaFactura] = useState(1)

  const [clienteQuery, setClienteQuery] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [nuevoClienteAbierto, setNuevoClienteAbierto] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', tipoDocumento: 'DNI' as 'DNI' | 'RUC' | 'CE', numeroDocumento: '' })
  const [creandoCliente, setCreandoCliente] = useState(false)

  // Precio editado en caja para una línea pendiente puntual (tratamiento o producto ya
  // registrado en la atención). Si no se toca, se cobra el precio acordado al asignarlo.
  const [preciosTratamientoOverride, setPreciosTratamientoOverride] = useState<Record<string, string>>({})
  const [preciosProductoOverride, setPreciosProductoOverride] = useState<Record<string, string>>({})
  const [facturaExpandida, setFacturaExpandida] = useState<string | null>(null)

  const itemsValidos = useMemo(() => form.items.filter((item) => item.productoId || item.tratamientoId), [form.items])

  const precioTratamientoEfectivo = (linea: PendienteTratamiento) => {
    const override = preciosTratamientoOverride[linea.id]
    return override !== undefined && override !== '' ? Number(override) || 0 : linea.precio
  }
  const precioProductoEfectivo = (item: PendienteProducto) => {
    const override = preciosProductoOverride[item.id]
    return override !== undefined && override !== '' ? Number(override) || 0 : item.precioUnit
  }

  const subtotalPendientes = useMemo(
    () =>
      pendientes.reduce(
        (sum, pendiente) =>
          sum +
          pendiente.tratamientos.reduce((s, item) => s + precioTratamientoEfectivo(item), 0) +
          pendiente.productos.reduce((s, item) => s + item.cantidad * precioProductoEfectivo(item), 0),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendientes, preciosTratamientoOverride, preciosProductoOverride],
  )
  const subtotalManual = useMemo(
    () => itemsValidos.reduce((sum, item) => sum + item.cantidad * item.precioUnit, 0),
    [itemsValidos],
  )
  const subtotal = subtotalPendientes + subtotalManual
  const total = subtotal

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
          {facturasPagina.map((factura) => {
            const expandida = facturaExpandida === factura.id
            const algunPrecioModificado = factura.items.some(
              (item) => item.precioCatalogo != null && precioFueModificado(item.precioUnit, item.precioCatalogo),
            )
            return (
              <Fragment key={factura.id}>
                <tr
                  onClick={() => setFacturaExpandida(expandida ? null : factura.id)}
                  className="cursor-pointer border-t border-[#eef1ec] hover:bg-slate-50"
                >
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                    {factura.fechaHora ? new Date(factura.fechaHora).toLocaleString('es-PE') : '—'}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-[#173d36]">
                    <ClienteHistorialLink clienteId={factura.cliente.id} nombre={factura.cliente.nombre} className="hover:text-emerald-700" />
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{factura.tipo}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    {factura.numeracionComprobante || 'Sin comprobante'}
                    {algunPrecioModificado && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Precio modificado</span>
                    )}
                  </td>
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
                    <div className="flex flex-wrap items-center gap-2">
                      {factura.enviado && factura.url ? (
                        <a
                          href={factura.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-full border border-[#00483f] px-4 py-1.5 text-xs font-bold text-[#00483f] transition hover:bg-[#00483f] hover:text-white"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        !puedeImprimirTicket(factura.tipo) && <span className="text-slate-400">—</span>
                      )}
                      {puedeImprimirTicket(factura.tipo) && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void imprimirTicket(factura, empresa)
                          }}
                          className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                        >
                          Reimprimir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandida && (
                  <tr className="border-t border-[#eef1ec] bg-slate-50/60">
                    <td colSpan={7} className="py-3 pr-4">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="pb-1 pr-3">Item</th>
                            <th className="pb-1 pr-3 text-right">Cant.</th>
                            <th className="pb-1 pr-3 text-right">Precio catálogo</th>
                            <th className="pb-1 pr-3 text-right">Precio cobrado</th>
                            <th className="pb-1 pr-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {factura.items.map((item) => {
                            const modificado = item.precioCatalogo != null && precioFueModificado(item.precioUnit, item.precioCatalogo)
                            return (
                              <tr key={item.id} className="border-t border-slate-200/70">
                                <td className="py-1.5 pr-3 text-slate-700">
                                  {item.nombre}
                                  {modificado && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Precio modificado</span>}
                                </td>
                                <td className="py-1.5 pr-3 text-right text-slate-600">{item.cantidad}</td>
                                <td className="py-1.5 pr-3 text-right text-slate-600">{item.precioCatalogo != null ? `S/ ${item.precioCatalogo.toFixed(2)}` : '—'}</td>
                                <td className={`py-1.5 pr-3 text-right ${modificado ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>S/ {item.precioUnit.toFixed(2)}</td>
                                <td className="py-1.5 pr-3 text-right font-semibold text-slate-700">S/ {item.total.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const loadData = async () => {
    const [clientesRes, productosRes, tratamientosRes, facturasRes, ajustesRes] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/productos'),
      fetch('/api/tratamientos'),
      fetch('/api/facturacion'),
      fetch('/api/ajustes'),
    ])

    const [clientesData, productosData, tratamientosData, facturasData, ajustesData] = await Promise.all([
      clientesRes.json(),
      productosRes.json(),
      tratamientosRes.json(),
      facturasRes.json(),
      ajustesRes.ok ? ajustesRes.json() : Promise.resolve(null),
    ])

    setClientes(Array.isArray(clientesData) ? clientesData : [])
    setProductos(Array.isArray(productosData) ? productosData : [])
    setTratamientos(Array.isArray(tratamientosData) ? tratamientosData.filter((t: Tratamiento) => t.activo) : [])
    setFacturas(Array.isArray(facturasData) ? facturasData : [])
    if (ajustesData) {
      setEmpresa({
        nombreEmpresa: ajustesData.nombreEmpresa || 'Spaxión Centro Estético',
        ruc: ajustesData.ruc || null,
        razonSocial: ajustesData.razonSocial || null,
        direccionFiscal: ajustesData.direccionFiscal || null,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    setPreciosTratamientoOverride({})
    setPreciosProductoOverride({})
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
        carnetExtranjeria: nuevoCliente.tipoDocumento === 'CE' ? nuevoCliente.numeroDocumento : null,
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
    setClienteQuery('')
    setNuevoClienteAbierto(false)
    setNuevoCliente({ nombre: '', tipoDocumento: 'DNI', numeroDocumento: '' })
    setPreciosTratamientoOverride({})
    setPreciosProductoOverride({})
  }

  const handleSubmit = async () => {
    if (!form.clienteId) return
    if (pendientes.length === 0 && itemsValidos.length === 0) return
    setSubmitting(true)

    const preciosTratamiento = Object.fromEntries(
      Object.entries(preciosTratamientoOverride)
        .filter(([, valor]) => valor !== '' && Number.isFinite(Number(valor)))
        .map(([id, valor]) => [id, Number(valor)]),
    )
    const preciosProducto = Object.fromEntries(
      Object.entries(preciosProductoOverride)
        .filter(([, valor]) => valor !== '' && Number.isFinite(Number(valor)))
        .map(([id, valor]) => [id, Number(valor)]),
    )

    const response = await fetch('/api/facturacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: form.clienteId,
        tratamientoLineIds: pendientes.flatMap((pendiente) => pendiente.tratamientos.map((t) => t.id)),
        productoLineIds: pendientes.flatMap((pendiente) => pendiente.productos.map((p) => p.id)),
        preciosTratamiento,
        preciosProducto,
        tipo: form.tipo,
        metodoPago: form.metodoPago,
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

    if (data && puedeImprimirTicket(data.tipo)) {
      await imprimirTicket(data, empresa)
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
          <p className="mt-2 text-slate-600">Registra ventas, ajusta el precio cuando corresponda y genera comprobantes con métodos de pago.</p>
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
                        onClick={() => setNuevoCliente((prev) => ({ ...prev, tipoDocumento: 'CE' }))}
                        className={`flex-1 px-3 py-2.5 font-semibold ${nuevoCliente.tipoDocumento === 'CE' ? 'bg-emerald-700 text-white' : 'text-slate-500'}`}
                      >CE</button>
                      <button
                        type="button"
                        onClick={() => setNuevoCliente((prev) => ({ ...prev, tipoDocumento: 'RUC' }))}
                        className={`flex-1 px-3 py-2.5 font-semibold ${nuevoCliente.tipoDocumento === 'RUC' ? 'bg-emerald-700 text-white' : 'text-slate-500'}`}
                      >RUC</button>
                    </div>
                    <input
                      value={nuevoCliente.numeroDocumento}
                      onChange={(event) => setNuevoCliente((prev) => ({ ...prev, numeroDocumento: event.target.value }))}
                      placeholder={nuevoCliente.tipoDocumento === 'DNI' ? 'Número de DNI' : nuevoCliente.tipoDocumento === 'CE' ? 'Número de Carnet de Extranjería' : 'Número de RUC'}
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
                        {pendiente.tratamientos.map((item) => {
                          const precioEfectivo = precioTratamientoEfectivo(item)
                          return (
                            <div key={item.id} className="mt-2 flex items-center justify-between gap-3 text-sm">
                              <span className="flex items-center gap-2 font-medium text-slate-900">
                                {item.nombre}
                                {precioFueModificado(precioEfectivo, item.precioCatalogo) && (
                                  <span title={`Precio de catálogo: S/ ${item.precioCatalogo.toFixed(2)}`} className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                    Precio modificado
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1 text-slate-600">
                                S/
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={preciosTratamientoOverride[item.id] ?? String(item.precio)}
                                  onChange={(event) => setPreciosTratamientoOverride((prev) => ({ ...prev, [item.id]: event.target.value }))}
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm outline-none focus:border-emerald-500"
                                />
                              </span>
                            </div>
                          )
                        })}
                        {pendiente.productos.map((item) => {
                          const precioEfectivo = precioProductoEfectivo(item)
                          return (
                            <div key={item.id} className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-2">
                                {item.producto.nombre} × {item.cantidad}
                                {precioFueModificado(precioEfectivo, item.precioCatalogo) && (
                                  <span title={`Precio de catálogo: S/ ${item.precioCatalogo.toFixed(2)}`} className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                    Precio modificado
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                S/
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={preciosProductoOverride[item.id] ?? String(item.precioUnit)}
                                  onChange={(event) => setPreciosProductoOverride((prev) => ({ ...prev, [item.id]: event.target.value }))}
                                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs outline-none focus:border-emerald-500"
                                />
                                <span>c/u</span>
                              </span>
                            </div>
                          )
                        })}
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
