'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/Modal'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toast'

interface Usuario {
  id: string
  name: string
}

interface CierreTurno {
  id: string
  fechaInicio: string
  fechaFin: string
  totalVentas: number
  totalEfectivo: number
  totalTarjeta: number
  totalYape: number
  totalTransferencia: number
  totalDeposito: number
  usuario: Usuario
}

interface FacturaPendiente {
  id: string
  creadoAt: string
  tipo: string
  metodoPago: string
  total: number
  cliente: { id: string; nombre: string }
}

interface Pendientes {
  facturas: FacturaPendiente[]
  totalesPorMetodo: Record<string, number>
  total: number
  fechaDesde: string | null
}

interface FacturaDetalle {
  id: string
  tipo: string
  numeracionComprobante: string | null
  metodoPago: string
  total: number
  creadoAt: string
  cliente: { id: string; nombre: string }
  items: { id: string; nombre: string; cantidad: number; precioUnit: number; total: number }[]
  atencionTratamientos: {
    id: string
    horaInicio: string | null
    horaFin: string | null
    precio: number | null
    tratamiento: { nombre: string }
    esteticista: { name: string }
    atencion: { cabina: { nombre: string } | null }
  }[]
}

function hora(fecha: string | null) {
  return fecha ? new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'
}

function DetalleCierre({ cierre, onClose }: { cierre: CierreTurno; onClose: () => void }) {
  const [facturas, setFacturas] = useState<FacturaDetalle[] | null>(null)

  useEffect(() => {
    fetch(`/api/cierres/${cierre.id}`)
      .then((res) => res.json())
      .then((data) => setFacturas(Array.isArray(data) ? data : []))
  }, [cierre.id])

  const totalAtenciones = facturas?.reduce((sum, f) => sum + f.atencionTratamientos.length, 0) ?? 0

  return (
    <Modal title={`Detalle del cierre · ${cierre.usuario.name}`} size="lg" onClose={onClose}>
      <p className="mt-1 text-sm text-slate-500">
        {new Date(cierre.fechaInicio).toLocaleString('es-PE')} → {new Date(cierre.fechaFin).toLocaleString('es-PE')}
      </p>
      {!facturas ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando detalle...</p>
      ) : facturas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Este cierre no tiene comprobantes asociados.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-semibold text-slate-700">
            {facturas.length} comprobante(s) · {totalAtenciones} tratamiento(s) · Total S/ {cierre.totalVentas.toFixed(2)}
          </p>
          {facturas.map((factura) => (
            <div key={factura.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{factura.cliente.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(factura.creadoAt).toLocaleString('es-PE')} · {factura.tipo.replace('_', ' ')}
                    {factura.numeracionComprobante ? ` ${factura.numeracionComprobante}` : ''} · {metodoLabels[factura.metodoPago] || factura.metodoPago}
                  </p>
                </div>
                <p className="text-lg font-semibold text-emerald-900">S/ {factura.total.toFixed(2)}</p>
              </div>

              {factura.atencionTratamientos.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-400">
                      <tr><th className="py-1 pr-4">Tratamiento</th><th className="py-1 pr-4">Esteticista</th><th className="py-1 pr-4">Cabina</th><th className="py-1 pr-4">Horario</th><th className="py-1 text-right">Precio</th></tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {factura.atencionTratamientos.map((linea) => (
                        <tr key={linea.id} className="border-t border-slate-100">
                          <td className="py-1.5 pr-4">{linea.tratamiento.nombre}</td>
                          <td className="py-1.5 pr-4">{linea.esteticista.name}</td>
                          <td className="py-1.5 pr-4">{linea.atencion.cabina?.nombre ?? '—'}</td>
                          <td className="py-1.5 pr-4">{hora(linea.horaInicio)} - {hora(linea.horaFin)}</td>
                          <td className="py-1.5 text-right">{linea.precio != null ? `S/ ${linea.precio.toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <ul className="mt-3 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-500">
                {factura.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>{item.cantidad} × {item.nombre} (S/ {item.precioUnit.toFixed(2)})</span>
                    <span>S/ {item.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

const metodoLabels: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito',
}

export default function ReportesPage() {
  const toast = useToast()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const esGerente = session?.user?.role === 'SUPERVISOR'
  const puedeCerrarTurno = isAdmin || esGerente
  const [cierres, setCierres] = useState<CierreTurno[]>([])
  const [pendientes, setPendientes] = useState<Pendientes | null>(null)
  const [loading, setLoading] = useState(true)
  const [cerrando, setCerrando] = useState(false)
  const [cierreDetalle, setCierreDetalle] = useState<CierreTurno | null>(null)

  const load = useCallback(async () => {
    const [cierresRes, pendientesRes] = await Promise.all([
      fetch('/api/cierres'),
      puedeCerrarTurno ? fetch('/api/cierres/pendientes') : Promise.resolve(null),
    ])
    const cierresData = await cierresRes.json()
    setCierres(Array.isArray(cierresData) ? cierresData : [])
    setPendientes(pendientesRes ? await pendientesRes.json() : null)
    setLoading(false)
  }, [puedeCerrarTurno])

  useEffect(() => { if (session) void load() }, [session, load])

  const totalVentas = useMemo(() => cierres.reduce((sum, item) => sum + item.totalVentas, 0), [cierres])
  const totalEfectivo = useMemo(() => cierres.reduce((sum, item) => sum + item.totalEfectivo, 0), [cierres])
  const totalTarjeta = useMemo(() => cierres.reduce((sum, item) => sum + item.totalTarjeta, 0), [cierres])
  const totalYape = useMemo(() => cierres.reduce((sum, item) => sum + item.totalYape, 0), [cierres])
  const totalTransferencia = useMemo(() => cierres.reduce((sum, item) => sum + item.totalTransferencia, 0), [cierres])
  const totalDeposito = useMemo(() => cierres.reduce((sum, item) => sum + item.totalDeposito, 0), [cierres])

  const cerrarTurno = async () => {
    setCerrando(true)
    const response = await fetch('/api/cierres', { method: 'POST' })
    setCerrando(false)
    if (!response.ok) {
      const data = await response.json()
      toast.error(data.error || 'No se pudo cerrar el turno')
      return
    }
    await load()
    toast.success('Turno cerrado correctamente')
  }

  const reportRows = loading ? (
    <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando datos...</p>
  ) : cierres.length === 0 ? (
    <p className="text-sm text-slate-500">No se han registrado cierres aún.</p>
  ) : (
    cierres.map((cierre) => (
      <div key={cierre.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">{cierre.usuario.name}</p>
            <p className="text-sm text-slate-500">{new Date(cierre.fechaInicio).toLocaleString('es-PE')} → {new Date(cierre.fechaFin).toLocaleString('es-PE')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setCierreDetalle(cierre)} className="rounded-full border border-emerald-200 px-4 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50">Ver detalle</button>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900">Turno</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Ventas', value: cierre.totalVentas },
            { label: 'Efectivo', value: cierre.totalEfectivo },
            { label: 'Tarjeta', value: cierre.totalTarjeta },
            { label: 'Yape / Plin', value: cierre.totalYape },
            { label: 'Transferencia', value: cierre.totalTransferencia },
            { label: 'Depósito', value: cierre.totalDeposito },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-xl font-semibold text-emerald-900">S/ {item.value.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    ))
  )

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Reportes</p>
          <h1 className="mt-3 page-heading text-3xl">Cierres de turno</h1>
          <p className="mt-2 text-slate-600">
            {isAdmin
              ? 'Cierra el turno actual y revisa los cierres de las últimas 24 horas.'
              : 'Revisa el historial completo de cierres de caja y métricas.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/historico/atenciones" className="btn-brand inline-flex">Ver histórico de atenciones</Link>
            {esGerente && <Link href="/reportes/mensual" className="btn-brand inline-flex">Ver reporte mensual</Link>}
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          {puedeCerrarTurno && (
            <div className="card-surface lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-emerald-900">Cobros pendientes de cerrar</h2>
                <button
                  type="button"
                  disabled={cerrando || !pendientes || pendientes.facturas.length === 0}
                  onClick={() => void cerrarTurno()}
                  className="btn-brand flex items-center gap-2 disabled:opacity-60"
                >
                  {cerrando && <Spinner />}
                  {cerrando ? 'Cerrando...' : 'Cerrar turno'}
                </button>
              </div>

              {!pendientes || pendientes.facturas.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">No hay cobros pendientes de cerrar en este momento.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-slate-500">
                    Desde {pendientes.fechaDesde ? new Date(pendientes.fechaDesde).toLocaleString('es-PE') : '—'} · {pendientes.facturas.length} comprobante(s) · Total S/ {pendientes.total.toFixed(2)}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {Object.entries(pendientes.totalesPorMetodo).map(([metodo, valor]) => (
                      <div key={metodo} className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metodoLabels[metodo] || metodo}</p>
                        <p className="mt-2 text-lg font-semibold text-emerald-900">S/ {valor.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">
                    {pendientes.facturas.map((factura) => (
                      <div key={factura.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{factura.cliente.nombre}</p>
                          <p className="text-xs text-slate-500">{new Date(factura.creadoAt).toLocaleString('es-PE')} · {factura.tipo} · {metodoLabels[factura.metodoPago] || factura.metodoPago}</p>
                        </div>
                        <span className="font-semibold text-slate-700">S/ {factura.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="card-surface">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{isAdmin ? 'Cierres (24h)' : 'Últimos cierres'}</p>
                <h2 className="mt-2 page-heading text-3xl">{cierres.length}</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900">{isAdmin ? 'Admin' : 'Gerente'}</span>
            </div>

            <div className="mt-6 space-y-4">
              {reportRows}
            </div>
          </div>

          <div className="card-surface">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
              <p className="eyebrow">Métricas</p>
              <h2 className="mt-3 page-heading text-3xl">Resumen actual</h2>
              <p className="mt-4 text-sm text-slate-600">Totales agregados desde los cierres disponibles.</p>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { label: 'Total ventas', value: totalVentas },
                { label: 'Total efectivo', value: totalEfectivo },
                { label: 'Total tarjeta', value: totalTarjeta },
                { label: 'Total Yape / Plin', value: totalYape },
                { label: 'Total transferencia', value: totalTransferencia },
                { label: 'Total depósito', value: totalDeposito },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-900">S/ {item.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      {cierreDetalle && <DetalleCierre cierre={cierreDetalle} onClose={() => setCierreDetalle(null)} />}
    </div>
  )
}
