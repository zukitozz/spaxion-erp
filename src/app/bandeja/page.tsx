'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Modal } from '@/components/Modal'
import { AtencionEnCursoPanel, type AtencionDetalle } from '@/components/AtencionEnCursoPanel'

function tiempoTranscurrido(horaInicio: string) {
  const minutos = Math.round((Date.now() - new Date(horaInicio).getTime()) / 60000)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  return `${horas} h ${minutos % 60} min`
}

function tratamientoActual(atencion: AtencionDetalle) {
  const enCurso = atencion.tratamientos.find((t) => t.estado === 'EN_CURSO')
  if (enCurso) return `${enCurso.tratamiento.nombre} (en curso)`
  const pendiente = atencion.tratamientos.find((t) => t.estado === 'PENDIENTE')
  if (pendiente) return `${pendiente.tratamiento.nombre} (pendiente)`
  return 'Sin tratamiento activo'
}

export default function BandejaPage() {
  const { data: session } = useSession()
  const [atenciones, setAtenciones] = useState<AtencionDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)

  const load = async () => {
    const response = await fetch('/api/atenciones/en-curso')
    const data = await response.json()
    setAtenciones(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const esEsteticista = session?.user?.role === 'ESTETICISTA'
  const seleccionada = atenciones.find((atencion) => atencion.id === seleccionadaId) ?? null

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Bandeja de Atención</p>
          <h1 className="mt-3 page-heading text-3xl">
            {esEsteticista ? 'Mis atenciones en curso' : 'Atenciones en curso'}
          </h1>
          <p className="mt-2 text-slate-600">Gestiona los tratamientos de cada visita y registra fotos de seguimiento.</p>
        </div>

        {loading ? (
          <div className="card-surface">Cargando atenciones...</div>
        ) : atenciones.length === 0 ? (
          <div className="card-surface">No hay atenciones en curso en este momento.</div>
        ) : (
          <div className="card-surface">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {atenciones.map((atencion) => (
                <button
                  key={atencion.id}
                  type="button"
                  onClick={() => setSeleccionadaId(atencion.id)}
                  className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="font-semibold text-amber-900">{atencion.cliente.nombre}</p>
                  <p className="mt-1 text-sm text-slate-600">{tratamientoActual(atencion)}</p>
                  <p className="mt-1 text-sm text-slate-500">Hace {tiempoTranscurrido(atencion.horaInicio)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {seleccionada && (
        <Modal title="Atención en curso" size="lg" onClose={() => setSeleccionadaId(null)}>
          <AtencionEnCursoPanel
            atencion={seleccionada}
            onClose={() => setSeleccionadaId(null)}
            onChanged={() => { void load() }}
          />
        </Modal>
      )}
    </div>
  )
}
