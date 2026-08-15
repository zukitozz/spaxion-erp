'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { CabinaCard, type AtencionActual, type CabinaEstado } from '@/components/CabinaCard'
import { Modal } from '@/components/Modal'
import { CabinaAtencionPanel } from '@/components/CabinaAtencionPanel'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

interface Cabina {
  id: string
  nombre: string
  estado: CabinaEstado
  atencionActual: AtencionActual | null
}

interface DashboardData {
  citas: { id: string; fecha: string; tratamiento: string; cliente: { id: string; nombre: string } }[]
  cabinas: Cabina[]
  totalFacturado: number
  totalPendiente: number
  productosStockBajo: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectedCabinaId = useAppStore((state) => state.selectedCabinaId)
  const setSelectedCabinaId = useAppStore((state) => state.setSelectedCabinaId)

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
          cabinas: Array.isArray(payload.cabinas) ? payload.cabinas : [],
          totalFacturado: typeof payload.totalFacturado === 'number' ? payload.totalFacturado : 0,
          totalPendiente: typeof payload.totalPendiente === 'number' ? payload.totalPendiente : 0,
          productosStockBajo: typeof payload.productosStockBajo === 'number' ? payload.productosStockBajo : 0,
        })
      })
      .catch((loadError: Error) => setError(loadError.message))
  }, [])

  useEffect(() => { load() }, [load])

  const cabinaSeleccionada = data?.cabinas.find((cabina) => cabina.id === selectedCabinaId) ?? null

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] bg-white/90 p-8 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-700/80">Panel de control</p>
          <h1 className="mt-4 text-3xl font-semibold text-emerald-900">Agenda y estado de cabinas</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Datos reales de la operación del día.</p>
          {error && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}. Vuelve a iniciar sesión para actualizar los datos.</p>}
        </header>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Citas del día', value: data?.citas?.length ?? 0 },
            { label: 'Facturado hoy', value: `S/ ${(data?.totalFacturado ?? 0).toFixed(2)}` },
            { label: 'Por cobrar', value: `S/ ${(data?.totalPendiente ?? 0).toFixed(2)}` },
            { label: 'Stock bajo', value: data?.productosStockBajo ?? 0 },
          ].map((metric) => (
            <div key={metric.label} className="card-surface">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-900">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="card-surface">
            <p className="text-sm text-slate-500">Agenda de hoy</p>
            <div className="mt-6 space-y-3">
              {data?.citas?.length ? data.citas.map((cita) => (
                <div key={cita.id} className="rounded-3xl bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-900">
                    {new Date(cita.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    <ClienteHistorialLink clienteId={cita.cliente.id} nombre={cita.cliente.nombre} className="underline decoration-dotted underline-offset-2 hover:text-emerald-700" />
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{cita.tratamiento}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No hay citas registradas para hoy.</p>}
            </div>
          </div>
          <div className="card-surface">
            <p className="text-sm text-slate-500">Cabinas</p>
            <div className="mt-6 space-y-3">
              {data?.cabinas?.length ? data.cabinas.map((cabina) => (
                <CabinaCard
                  key={cabina.id}
                  nombre={cabina.nombre}
                  estado={cabina.estado}
                  atencionActual={cabina.atencionActual}
                  onClick={() => setSelectedCabinaId(cabina.id)}
                />
              )) : <p className="text-sm text-slate-500">No hay cabinas registradas.</p>}
            </div>
          </div>
        </section>
      </div>

      {cabinaSeleccionada && (
        <Modal title={cabinaSeleccionada.nombre} onClose={() => setSelectedCabinaId(null)}>
          <CabinaAtencionPanel
            cabina={cabinaSeleccionada}
            onClose={() => setSelectedCabinaId(null)}
            onChanged={() => { load(); setSelectedCabinaId(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
