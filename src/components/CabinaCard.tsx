import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'
import type { AtencionDetalle } from '@/components/AtencionEnCursoPanel'

export type CabinaEstado = 'DISPONIBLE' | 'ATENCION' | 'LIMPIEZA' | 'MANTENIMIENTO'

export type AtencionActual = AtencionDetalle

interface CabinaCardProps {
  nombre: string
  estado: CabinaEstado
  atencionActual?: AtencionActual | null
  onClick?: () => void
}

const estadoStyles: Record<CabinaEstado, string> = {
  DISPONIBLE: 'border-emerald-100 bg-emerald-50 text-emerald-900',
  ATENCION: 'border-amber-100 bg-amber-50 text-amber-900',
  LIMPIEZA: 'border-slate-200 bg-slate-100 text-slate-700',
  MANTENIMIENTO: 'border-rose-100 bg-rose-50 text-rose-900',
}

const estadoLabels: Record<CabinaEstado, string> = {
  DISPONIBLE: 'Disponible',
  ATENCION: 'En atención',
  LIMPIEZA: 'Limpieza',
  MANTENIMIENTO: 'Mantenimiento',
}

function tratamientoActual(atencion: AtencionActual) {
  return (
    atencion.tratamientos.find((t) => t.estado === 'EN_CURSO') ??
    atencion.tratamientos.find((t) => t.estado === 'PENDIENTE') ??
    null
  )
}

export function CabinaCard({ nombre, estado, atencionActual, onClick }: CabinaCardProps) {
  const linea = atencionActual ? tratamientoActual(atencionActual) : null

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => { if (event.key === 'Enter' || event.key === ' ') onClick() } : undefined}
      className={`rounded-[28px] border p-5 ${estadoStyles[estado]} shadow-sm ${onClick ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <p className="text-sm font-bold opacity-75">{nombre}</p>
      <p className="page-heading mt-2 text-2xl">{estadoLabels[estado]}</p>
      {atencionActual && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-slate-700">
            <ClienteHistorialLink clienteId={atencionActual.cliente.id} nombre={atencionActual.cliente.nombre} stopPropagation className="font-semibold underline decoration-dotted underline-offset-2 hover:text-emerald-700" />
            {linea ? <> · {linea.tratamiento.nombre}</> : null}
          </p>
          {linea && <p className="text-slate-500">Esteticista: {linea.esteticista.name}</p>}
          <p className="text-slate-500">Desde {new Date(atencionActual.horaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      )}
    </div>
  )
}
