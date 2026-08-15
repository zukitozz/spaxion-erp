'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/Modal'
import { AtencionFotos } from '@/components/AtencionFotos'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

interface AtencionEnCurso {
  id: string
  horaInicio: string
  cabina: { id: string; nombre: string }
  cliente: { id: string; nombre: string }
  tratamiento: { nombre: string }
  esteticista: { id: string; name: string }
}

function tiempoTranscurrido(horaInicio: string) {
  const minutos = Math.round((Date.now() - new Date(horaInicio).getTime()) / 60000)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  return `${horas} h ${minutos % 60} min`
}

export default function BandejaPage() {
  const { data: session } = useSession()
  const [atenciones, setAtenciones] = useState<AtencionEnCurso[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionada, setSeleccionada] = useState<AtencionEnCurso | null>(null)

  const load = async () => {
    const response = await fetch('/api/atenciones/en-curso')
    const data = await response.json()
    setAtenciones(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const esEsteticista = session?.user?.role === 'ESTETICISTA'
  const grupos = new Map<string, AtencionEnCurso[]>()
  atenciones.forEach((atencion) => {
    const key = atencion.esteticista.name
    grupos.set(key, [...(grupos.get(key) ?? []), atencion])
  })

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Bandeja de Atención</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900">
            {esEsteticista ? 'Mis atenciones en curso' : 'Atenciones en curso por esteticista'}
          </h1>
          <p className="mt-2 text-slate-600">Registra las fotos de seguimiento del tratamiento sin necesidad de abrir el tablero completo de cabinas.</p>
        </div>

        {loading ? (
          <div className="card-surface">Cargando atenciones...</div>
        ) : atenciones.length === 0 ? (
          <div className="card-surface">No hay atenciones en curso en este momento.</div>
        ) : (
          Array.from(grupos.entries()).map(([nombreEsteticista, items]) => (
            <div key={nombreEsteticista} className="card-surface">
              {!esEsteticista && <h2 className="text-lg font-semibold text-emerald-900">{nombreEsteticista}</h2>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((atencion) => (
                  <button
                    key={atencion.id}
                    type="button"
                    onClick={() => setSeleccionada(atencion)}
                    className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="font-semibold text-amber-900">{atencion.cliente.nombre}</p>
                    <p className="mt-1 text-sm text-slate-600">{atencion.tratamiento.nombre}</p>
                    <p className="mt-1 text-sm text-slate-500">Cabina: {atencion.cabina.nombre}</p>
                    <p className="mt-1 text-sm text-slate-500">Hace {tiempoTranscurrido(atencion.horaInicio)}</p>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {seleccionada && (
        <Modal title={seleccionada.cliente.nombre} onClose={() => setSeleccionada(null)}>
          <div className="space-y-4">
            <div className="rounded-3xl bg-amber-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-amber-900">{seleccionada.tratamiento.nombre}</p>
                <ClienteHistorialLink
                  clienteId={seleccionada.cliente.id}
                  nombre="Ver historial"
                  className="text-xs font-semibold text-emerald-700 underline decoration-dotted underline-offset-2 hover:text-emerald-900"
                />
              </div>
              <p className="mt-1 text-sm text-slate-600">Cabina: {seleccionada.cabina.nombre}</p>
              <p className="mt-1 text-sm text-slate-600">Esteticista: {seleccionada.esteticista.name}</p>
              <p className="mt-1 text-sm text-slate-500">Desde {new Date(seleccionada.horaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <AtencionFotos atencionId={seleccionada.id} />
          </div>
        </Modal>
      )}
    </div>
  )
}
