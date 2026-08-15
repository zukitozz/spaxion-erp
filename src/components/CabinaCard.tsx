import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

export type CabinaEstado = 'DISPONIBLE' | 'ATENCION' | 'LIMPIEZA' | 'MANTENIMIENTO'

export interface AtencionActual {
  id: string
  horaInicio: string
  notas: string | null
  cliente: { id: string; nombre: string }
  tratamiento: { nombre: string; diasProximoTratamiento?: number | null }
  esteticista: { name: string }
}

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

export function CabinaCard({ nombre, estado, atencionActual, onClick }: CabinaCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => { if (event.key === 'Enter' || event.key === ' ') onClick() } : undefined}
      className={`rounded-[28px] border p-5 ${estadoStyles[estado]} shadow-sm ${onClick ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <p className="text-sm font-semibold">{nombre}</p>
      <p className="mt-3 text-2xl font-semibold">{estadoLabels[estado]}</p>
      {atencionActual && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-slate-700">
            <ClienteHistorialLink clienteId={atencionActual.cliente.id} nombre={atencionActual.cliente.nombre} stopPropagation className="font-semibold underline decoration-dotted underline-offset-2 hover:text-emerald-700" />
            {' '}· {atencionActual.tratamiento.nombre}
          </p>
          <p className="text-slate-500">Esteticista: {atencionActual.esteticista.name}</p>
          <p className="text-slate-500">Desde {new Date(atencionActual.horaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      )}
    </div>
  )
}
