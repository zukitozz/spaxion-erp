'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { CitaFormModal, type Cita } from '@/components/CitaFormModal'
import { Spinner } from '@/components/Spinner'

interface Cliente {
  id: string
  nombre: string
}

interface Tratamiento {
  id: string
  nombre: string
  activo: boolean
  duracionMin: number
}

type Vista = 'dia' | 'semana' | 'mes'

type ModalState =
  | { modo: 'crear'; fechaInicial: string }
  | { modo: 'editar'; cita: Cita }
  | null

const badgeStyles: Record<string, { bg: string; color: string }> = {
  PENDIENTE: { bg: '#fdf3e0', color: '#92620c' },
  CONFIRMADA: { bg: '#ecf8f2', color: '#1d6f50' },
  ATENDIDA: { bg: '#f1f5f9', color: '#334155' },
  CANCELADA: { bg: '#fdeceb', color: '#b3403a' },
  EXPIRADA: { bg: '#f1f5f9', color: '#64748b' },
}

const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function dateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function buildWeek(fechaAncla: Date) {
  const start = startOfWeek(fechaAncla)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function buildMonthGrid(fechaAncla: Date) {
  const firstOfMonth = new Date(fechaAncla.getFullYear(), fechaAncla.getMonth(), 1)
  const start = startOfWeek(firstOfMonth)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function minutosDesdeMedianoche(iso: string) {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

const ALTURA_HORA = 60

interface CitaPosicionada {
  cita: Cita
  inicio: number
  fin: number
  col: number
  totalCols: number
}

/**
 * Igual que Google Calendar: las citas que se solapan en el tiempo se agrupan
 * (transitivamente) y dentro de cada grupo se reparten en columnas lado a lado
 * en vez de taparse unas a otras.
 */
function calcularPosiciones(citas: Cita[]): CitaPosicionada[] {
  const eventos = citas
    .map((cita) => {
      const inicio = minutosDesdeMedianoche(cita.fecha)
      return { cita, inicio, fin: inicio + (cita.duracionMin || 60) }
    })
    .sort((a, b) => a.inicio - b.inicio || a.fin - b.fin)

  const resultado: CitaPosicionada[] = []
  let grupo: typeof eventos = []
  let finMaximoGrupo = -Infinity

  const cerrarGrupo = () => {
    if (grupo.length === 0) return
    const columnasFin: number[] = []
    for (const evento of grupo) {
      let col = columnasFin.findIndex((fin) => fin <= evento.inicio)
      if (col === -1) {
        col = columnasFin.length
        columnasFin.push(evento.fin)
      } else {
        columnasFin[col] = evento.fin
      }
      resultado.push({ cita: evento.cita, inicio: evento.inicio, fin: evento.fin, col, totalCols: 0 })
    }
    const totalCols = columnasFin.length
    for (let i = resultado.length - grupo.length; i < resultado.length; i += 1) {
      resultado[i].totalCols = totalCols
    }
    grupo = []
    finMaximoGrupo = -Infinity
  }

  for (const evento of eventos) {
    if (grupo.length > 0 && evento.inicio >= finMaximoGrupo) cerrarGrupo()
    grupo.push(evento)
    finMaximoGrupo = Math.max(finMaximoGrupo, evento.fin)
  }
  cerrarGrupo()

  return resultado
}

function DiaView({
  citasDelDia,
  esHoy,
  puedeCrear,
  onSlotClick,
  onCitaClick,
}: {
  citasDelDia: Cita[]
  esHoy: boolean
  puedeCrear: boolean
  onSlotClick: () => void
  onCitaClick: (cita: Cita) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: Math.max(0, 7 * ALTURA_HORA - 40) })
  }, [])

  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  const posiciones = useMemo(() => calcularPosiciones(citasDelDia), [citasDelDia])

  return (
    <div ref={scrollRef} className="max-h-[65vh] overflow-y-auto">
      <div className="relative" style={{ height: 24 * ALTURA_HORA }}>
        {Array.from({ length: 24 }, (_, hora) => (
          <div
            key={hora}
            onClick={puedeCrear ? onSlotClick : undefined}
            className={`absolute inset-x-0 flex border-t border-[#eef1ec] ${puedeCrear ? 'cursor-pointer hover:bg-[#fbfaf6]' : 'cursor-default'}`}
            style={{ top: hora * ALTURA_HORA, height: ALTURA_HORA }}
          >
            <span className="w-14 shrink-0 -translate-y-2.5 pl-2 text-[10px] font-semibold text-slate-400">
              {hora === 0 ? '' : `${String(hora).padStart(2, '0')}:00`}
            </span>
          </div>
        ))}

        {esHoy && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
            style={{ top: (minutosAhora / 60) * ALTURA_HORA }}
          >
            <span className="ml-14 -translate-x-1 h-2 w-2 rounded-full bg-rose-500" />
            <span className="h-px flex-1 bg-rose-500" />
          </div>
        )}

        <div className="absolute inset-y-0 left-14 right-2">
          {posiciones.map(({ cita, inicio, fin, col, totalCols }) => {
            const top = (inicio / 60) * ALTURA_HORA
            const alto = Math.max(22, ((fin - inicio) / 60) * ALTURA_HORA - 2)
            const anchoPct = 100 / totalCols
            const izquierdaPct = col * anchoPct
            const sinCliente = !cita.cliente
            const badge = badgeStyles[cita.estado] ?? badgeStyles.PENDIENTE
            return (
              <button
                key={cita.id}
                type="button"
                onClick={(event) => { event.stopPropagation(); onCitaClick(cita) }}
                className="absolute z-10 overflow-hidden rounded-lg px-2 py-1 text-left shadow-sm transition hover:brightness-95"
                style={{
                  top,
                  height: alto,
                  left: `calc(${izquierdaPct}% + ${col > 0 ? '2px' : '0px'})`,
                  width: `calc(${anchoPct}% - 2px)`,
                  background: sinCliente ? '#f3c98a' : badge.bg,
                  color: sinCliente ? '#7a4a08' : badge.color,
                }}
              >
                <p className="truncate text-xs font-bold">{formatHora(cita.fecha)} · {sinCliente ? '⚠ Sin cliente' : cita.cliente!.nombre}</p>
                {alto > 32 && (
                  <p className="truncate text-[11px] font-medium opacity-80">{cita.tratamiento}{cita.origen === 'GOOGLE' ? ' · G' : ''}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const SYNC_INTERVAL_MS = 45_000

export default function CitasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [vista, setVista] = useState<Vista>('semana')
  const [fechaAncla, setFechaAncla] = useState(() => new Date())
  const [modal, setModal] = useState<ModalState>(null)
  const [diaDetalle, setDiaDetalle] = useState<string | null>(null)
  const [sincronizando, setSincronizando] = useState(false)

  const sincronizarCalendar = () => {
    setSincronizando(true)
    return fetch('/api/integraciones/google-calendar/sync', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data.citas)) setCitas(data.citas) })
      .catch(() => {})
      .finally(() => setSincronizando(false))
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/clientes').then((res) => res.json()),
      fetch('/api/citas').then((res) => res.json()),
      fetch('/api/tratamientos').then((res) => res.json()),
    ]).then(([clientesData, citasData, tratamientosData]) => {
      setClientes(Array.isArray(clientesData) ? clientesData : [])
      setCitas(Array.isArray(citasData) ? citasData : [])
      setTratamientos(Array.isArray(tratamientosData) ? tratamientosData : [])
    })

    // Sync con Google Calendar en segundo plano: no bloquea el render inicial.
    // Se repite mientras la pantalla esté abierta para reflejar cambios hechos
    // directamente en Google Calendar (no hay webhook, es polling).
    void sincronizarCalendar()
    const id = setInterval(() => void sincronizarCalendar(), SYNC_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const citasPorDia = useMemo(() => {
    const map = new Map<string, Cita[]>()
    for (const cita of citas) {
      const key = dateKey(new Date(cita.fecha))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(cita)
    }
    for (const lista of map.values()) lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
    return map
  }, [citas])

  const dias = useMemo(() => {
    if (vista === 'semana') return buildWeek(fechaAncla)
    if (vista === 'mes') return buildMonthGrid(fechaAncla)
    return []
  }, [vista, fechaAncla])
  const hoyKey = dateKey(new Date())

  const navegar = (delta: number) => {
    setFechaAncla((prev) => {
      const next = new Date(prev)
      if (vista === 'dia') next.setDate(prev.getDate() + delta)
      else if (vista === 'semana') next.setDate(prev.getDate() + delta * 7)
      else next.setMonth(prev.getMonth() + delta, 1)
      return next
    })
  }

  const etiquetaRango = useMemo(() => {
    if (vista === 'dia') return fechaAncla.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (vista === 'mes') return fechaAncla.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
    const semana = buildWeek(fechaAncla)
    const inicio = semana[0].toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
    const fin = semana[6].toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${inicio} – ${fin}`
  }, [vista, fechaAncla])

  const abrirCrear = (key: string) => {
    if (key < hoyKey) return
    setModal({ modo: 'crear', fechaInicial: key })
  }

  const handleGuardado = (cita: Cita) => {
    setCitas((prev) => (prev.some((c) => c.id === cita.id) ? prev.map((c) => (c.id === cita.id ? cita : c)) : [...prev, cita]))
  }

  const handleEliminado = (citaId: string) => {
    setCitas((prev) => prev.filter((c) => c.id !== citaId))
  }

  const chip = (cita: Cita) => {
    const sinCliente = !cita.cliente
    const badge = badgeStyles[cita.estado] ?? badgeStyles.PENDIENTE
    return (
      <button
        key={cita.id}
        type="button"
        onClick={(event) => { event.stopPropagation(); setModal({ modo: 'editar', cita }) }}
        className="block w-full truncate rounded-md px-2 py-1 text-left text-[11px] font-semibold transition hover:brightness-95"
        style={sinCliente ? { background: '#f3c98a', color: '#7a4a08' } : { background: badge.bg, color: badge.color }}
        title={`${cita.cliente?.nombre ?? 'Sin cliente'} · ${cita.tratamiento}`}
      >
        {formatHora(cita.fecha)} {sinCliente ? '⚠ Sin cliente' : cita.cliente!.nombre}
        {cita.origen === 'GOOGLE' && ' · G'}
      </button>
    )
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Citas</p>
          <h1 className="page-heading mt-3 text-3xl">Agenda y check-in</h1>
          <p className="mt-2 text-slate-600">Administra las citas y asigna tratamiento al cliente.</p>
        </div>

        <div className="card-surface flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-[#dfe8e0]">
            <button
              type="button"
              onClick={() => setVista('dia')}
              className={`px-4 py-2 text-sm font-semibold transition ${vista === 'dia' ? 'bg-[#00483f] text-white' : 'bg-white text-[#334155] hover:bg-[#f1f5f4]'}`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setVista('semana')}
              className={`px-4 py-2 text-sm font-semibold transition ${vista === 'semana' ? 'bg-[#00483f] text-white' : 'bg-white text-[#334155] hover:bg-[#f1f5f4]'}`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setVista('mes')}
              className={`px-4 py-2 text-sm font-semibold transition ${vista === 'mes' ? 'bg-[#00483f] text-white' : 'bg-white text-[#334155] hover:bg-[#f1f5f4]'}`}
            >
              Mes
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => navegar(-1)} aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-[#334155] hover:bg-[#f1f5f4]">‹</button>
            <button type="button" onClick={() => setFechaAncla(new Date())} className="rounded-full border border-[#dfe8e0] px-3 py-1.5 text-xs font-bold text-[#334155] hover:bg-[#f1f5f4]">Hoy</button>
            <button type="button" onClick={() => navegar(1)} aria-label="Siguiente" className="flex h-9 w-9 items-center justify-center rounded-full text-[#334155] hover:bg-[#f1f5f4]">›</button>
          </div>

          <p className="page-heading flex-1 text-base capitalize text-[#173d36]">{etiquetaRango}</p>

          {sincronizando && (
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Spinner /> Sincronizando Google Calendar...
            </span>
          )}

          <button
            type="button"
            onClick={() => setModal({ modo: 'crear', fechaInicial: dateKey(new Date()) })}
            className="btn-brand"
          >
            + Nueva cita
          </button>
        </div>

        <div className="card-surface !p-0 overflow-hidden">
          {vista === 'dia' ? (
            <DiaView
              citasDelDia={citasPorDia.get(dateKey(fechaAncla)) || []}
              esHoy={dateKey(fechaAncla) === hoyKey}
              puedeCrear={dateKey(fechaAncla) >= hoyKey}
              onSlotClick={() => abrirCrear(dateKey(fechaAncla))}
              onCitaClick={(cita) => setModal({ modo: 'editar', cita })}
            />
          ) : vista === 'semana' ? (
            <div className="grid grid-flow-col auto-cols-[minmax(150px,1fr)] divide-x divide-[#eef1ec] overflow-x-auto">
              {dias.map((dia) => {
                const key = dateKey(dia)
                const citasDelDia = citasPorDia.get(key) || []
                const esHoy = key === hoyKey
                const esPasado = key < hoyKey
                const colorEtiqueta = esHoy ? 'opacity-80' : (esPasado ? 'text-slate-300' : 'text-slate-500')
                return (
                  <div
                    key={key}
                    onClick={() => abrirCrear(key)}
                    className={`flex min-h-[420px] flex-col p-2 ${esPasado ? 'cursor-default bg-[#fbfaf6]/60' : 'cursor-pointer hover:bg-[#fbfaf6]'}`}
                  >
                    <div className={`mb-2 rounded-lg px-2 py-1.5 text-center ${esHoy ? 'bg-[#00483f] text-white' : ''}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${colorEtiqueta}`}>{diasSemana[(dia.getDay() + 6) % 7]}</p>
                      <p className={`page-heading text-base ${esPasado && !esHoy ? 'text-slate-300' : ''}`}>{dia.getDate()}</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {citasDelDia.map((cita) => chip(cita))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 divide-x divide-[#eef1ec] border-b border-[#eef1ec] bg-[#fbfaf6]">
                {diasSemana.map((d) => (
                  <p key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">{d}</p>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-[#eef1ec]">
                {dias.map((dia) => {
                  const key = dateKey(dia)
                  const citasDelDia = citasPorDia.get(key) || []
                  const esHoy = key === hoyKey
                  const esPasado = key < hoyKey
                  const fueraDeMes = dia.getMonth() !== fechaAncla.getMonth()
                  const visibles = citasDelDia.slice(0, 3)
                  const restantes = citasDelDia.length - visibles.length
                  const colorNumero = fueraDeMes || esPasado ? 'text-slate-300' : 'text-slate-500'
                  return (
                    <div
                      key={key}
                      onClick={() => abrirCrear(key)}
                      className={`min-h-[110px] space-y-1 p-2 ${esPasado ? 'cursor-default bg-[#fbfaf6]/60' : 'cursor-pointer hover:bg-[#fbfaf6]'} ${fueraDeMes ? 'bg-[#fbfaf6]/60' : ''}`}
                    >
                      <p className={`text-[11px] font-bold ${esHoy ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00483f] text-white' : colorNumero}`}>
                        {dia.getDate()}
                      </p>
                      {visibles.map((cita) => chip(cita))}
                      {restantes > 0 && (
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setDiaDetalle(key) }}
                          className="block w-full truncate rounded-md px-2 py-0.5 text-left text-[10px] font-bold text-[#9a7e62] hover:underline"
                        >
                          +{restantes} más
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <CitaFormModal
          modo={modal.modo}
          cita={modal.modo === 'editar' ? modal.cita : undefined}
          fechaInicial={modal.modo === 'crear' ? modal.fechaInicial : undefined}
          clientes={clientes}
          tratamientos={tratamientos}
          onClose={() => setModal(null)}
          onGuardado={handleGuardado}
          onEliminado={handleEliminado}
        />
      )}

      {diaDetalle && (
        <Modal title={`Citas del ${new Date(`${diaDetalle}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}`} onClose={() => setDiaDetalle(null)}>
          <div className="space-y-2">
            {(citasPorDia.get(diaDetalle) || []).map((cita) => (
              <button
                key={cita.id}
                type="button"
                onClick={() => { setDiaDetalle(null); setModal({ modo: 'editar', cita }) }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#eef1ec] px-4 py-3 text-left text-sm hover:bg-[#ecf8f2]"
              >
                <span className="font-semibold text-[#173d36]">{formatHora(cita.fecha)} · {cita.cliente?.nombre ?? 'Sin cliente'}</span>
                <span className="text-slate-500">{cita.tratamiento}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
