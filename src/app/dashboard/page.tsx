'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck, AlertTriangle, Banknote, CreditCard, Plus } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { AtencionEnCursoPanel, type AtencionDetalle } from '@/components/AtencionEnCursoPanel'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

interface DashboardData {
  citas: { id: string; fecha: string; tratamiento: string; cliente: { id: string; nombre: string } | null }[]
  atencionesEnCurso: AtencionDetalle[]
  totalFacturado: number
  totalPendiente: number
  productosStockBajo: number
}

function tratamientoActual(atencion: AtencionDetalle) {
  const enCurso = atencion.tratamientos.find((t) => t.estado === 'EN_CURSO')
  if (enCurso) return `${enCurso.tratamiento.nombre} (en curso)`
  const pendiente = atencion.tratamientos.find((t) => t.estado === 'PENDIENTE')
  if (pendiente) return `${pendiente.tratamiento.nombre} (pendiente)`
  return 'Sin tratamiento activo'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [atencionSeleccionadaId, setAtencionSeleccionadaId] = useState<string | null>(null)
  const [creandoAtencion, setCreandoAtencion] = useState(false)

  const load = useCallback(() => {
    fetch('/api/dashboard')
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el dashboard')
        return payload
      })
      .then((payload: Partial<DashboardData>) => {
        setData({
          citas: Array.isArray(payload.citas) ? payload.citas : [],
          atencionesEnCurso: Array.isArray(payload.atencionesEnCurso) ? payload.atencionesEnCurso : [],
          totalFacturado: typeof payload.totalFacturado === 'number' ? payload.totalFacturado : 0,
          totalPendiente: typeof payload.totalPendiente === 'number' ? payload.totalPendiente : 0,
          productosStockBajo: typeof payload.productosStockBajo === 'number' ? payload.productosStockBajo : 0,
        })
      })
      .catch((loadError: Error) => setError(loadError.message))
  }, [])

  useEffect(() => { load() }, [load])

  const atencionSeleccionada = data?.atencionesEnCurso.find((atencion) => atencion.id === atencionSeleccionadaId) ?? null

  const stats = [
    { label: 'Citas del día', value: String(data?.citas?.length ?? 0), tint: '#ecf8f2', color: '#1d6f50', Icon: CalendarCheck },
    { label: 'Facturado hoy', value: `S/ ${(data?.totalFacturado ?? 0).toFixed(2)}`, tint: '#f5efe4', color: '#9a7e62', Icon: Banknote },
    { label: 'Por cobrar', value: `S/ ${(data?.totalPendiente ?? 0).toFixed(2)}`, tint: '#fdf3e0', color: '#b8860b', Icon: CreditCard },
    { label: 'Stock bajo', value: String(data?.productosStockBajo ?? 0), tint: '#fdeceb', color: '#b3403a', Icon: AlertTriangle },
  ]

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="card-surface p-8">
          <p className="eyebrow">Panel de control</p>
          <h1 className="page-heading mt-3 text-3xl">Agenda y atenciones en curso</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Datos reales de la operación del día.</p>
          {error && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}. Vuelve a iniciar sesión para actualizar los datos.</p>}
        </header>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((metric) => (
            <div key={metric.label} className="card-surface">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: metric.tint }}>
                <metric.Icon size={19} color={metric.color} strokeWidth={1.8} />
              </div>
              <p className="mt-4 text-sm text-slate-500">{metric.label}</p>
              <p className="page-heading mt-1 text-3xl">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="card-surface">
            <p className="text-base font-extrabold text-[#173d36]">Agenda de hoy</p>
            <div className="mt-6 space-y-3">
              {data?.citas?.length ? data.citas.map((cita) => (
                <div key={cita.id} className="flex items-center gap-4 rounded-2xl bg-[#f5faf7] p-4">
                  <p className="page-heading w-16 shrink-0 text-[15px]">
                    {new Date(cita.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="min-w-0 flex-1">
                    {cita.cliente ? (
                      <ClienteHistorialLink clienteId={cita.cliente.id} nombre={cita.cliente.nombre} className="font-bold text-[#173d36] underline decoration-dotted underline-offset-2 hover:text-emerald-700" />
                    ) : (
                      <span className="font-bold text-slate-500">Sin cliente (Google Calendar)</span>
                    )}
                    <p className="mt-1 text-sm text-slate-600">{cita.tratamiento}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">No hay citas registradas para hoy.</p>}
            </div>
          </div>
          <div className="card-surface">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-extrabold text-[#173d36]">Atenciones en curso</p>
              <button
                type="button"
                onClick={() => setCreandoAtencion(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00483f] text-white transition hover:brightness-110"
                aria-label="Nueva atención"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {data?.atencionesEnCurso?.length ? data.atencionesEnCurso.map((atencion) => (
                <button
                  key={atencion.id}
                  type="button"
                  onClick={() => setAtencionSeleccionadaId(atencion.id)}
                  className="block w-full rounded-2xl border border-amber-100 bg-amber-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="font-bold text-amber-900">{atencion.cliente.nombre}</p>
                  <p className="mt-1 text-sm text-slate-600">{tratamientoActual(atencion)}</p>
                  <p className="mt-1 text-sm text-slate-500">Desde {new Date(atencion.horaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                </button>
              )) : <p className="text-sm text-slate-500">No hay atenciones en curso.</p>}
            </div>
          </div>
        </section>
      </div>

      {atencionSeleccionada && (
        <Modal title="Atención en curso" size="lg" onClose={() => setAtencionSeleccionadaId(null)}>
          <AtencionEnCursoPanel
            atencion={atencionSeleccionada}
            onClose={() => setAtencionSeleccionadaId(null)}
            onChanged={() => load()}
          />
        </Modal>
      )}

      {creandoAtencion && (
        <Modal title="Nueva atención" onClose={() => setCreandoAtencion(false)}>
          <AtencionEnCursoPanel
            atencion={null}
            onClose={() => setCreandoAtencion(false)}
            onChanged={() => { load(); setCreandoAtencion(false) }}
          />
        </Modal>
      )}
    </div>
  )
}
