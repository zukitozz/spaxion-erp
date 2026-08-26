'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera } from 'lucide-react'
import { Modal } from '@/components/Modal'

interface Cliente { id: string; nombre: string }
interface Tratamiento { id: string; nombre: string; precio?: number }
interface Cabina { id: string; nombre: string }
interface Esteticista { id: string; name: string }
interface Foto { id: string; url: string; descripcion: string | null; creadoAt: string }

function formatearFechaFoto(fecha: string) {
  return new Date(fecha).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Atencion {
  id: string
  horaInicio: string
  horaFin: string | null
  notas: string | null
  estado: 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA'
  cabina: Cabina
  cliente: Cliente
  tratamiento: { id: string; nombre: string; duracionMin: number; precio: number }
  esteticista: Esteticista
  cita: { id: string; fecha: string } | null
  fotos: Foto[]
}

const estadoLabels: Record<Atencion['estado'], string> = {
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

function calcularDuracion(atencion: Atencion) {
  if (!atencion.horaFin) return '—'
  const minutos = Math.round((new Date(atencion.horaFin).getTime() - new Date(atencion.horaInicio).getTime()) / 60000)
  return `${minutos} min`
}

function FotosPreview({ fotos }: { fotos: Foto[] }) {
  if (fotos.length === 0) {
    return <Camera size={18} className="text-slate-300" aria-hidden />
  }

  return (
    <div className="group relative inline-flex" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="relative flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-50">
        <Camera size={18} />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
          {fotos.length}
        </span>
      </button>
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-max max-w-xs -translate-x-1/2 flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg group-hover:flex">
        {fotos.slice(0, 8).map((foto) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={foto.id} src={foto.url} alt={formatearFechaFoto(foto.creadoAt)} title={formatearFechaFoto(foto.creadoAt)} className="h-14 w-14 rounded-xl border border-slate-200 object-cover" />
        ))}
        {fotos.length > 8 && <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">+{fotos.length - 8}</span>}
      </div>
    </div>
  )
}

function DetalleAtencion({ atencion, onClose }: { atencion: Atencion; onClose: () => void }) {
  return (
    <Modal title={atencion.cliente.nombre} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tratamiento</p><p className="text-sm font-semibold text-slate-900">{atencion.tratamiento.nombre}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Costo</p><p className="text-sm font-semibold text-slate-900">S/ {atencion.tratamiento.precio.toFixed(2)}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cabina</p><p className="text-sm text-slate-700">{atencion.cabina.nombre}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Esteticista</p><p className="text-sm text-slate-700">{atencion.esteticista.name}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Inicio</p><p className="text-sm text-slate-700">{new Date(atencion.horaInicio).toLocaleString('es-PE')}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Duración</p><p className="text-sm text-slate-700">{calcularDuracion(atencion)}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cita</p><p className="text-sm text-slate-700">{atencion.cita ? new Date(atencion.cita.fecha).toLocaleString('es-PE') : 'Walk-in'}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estado</p><p className="text-sm text-slate-700">{estadoLabels[atencion.estado]}</p></div>
        </div>

        {atencion.notas && (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Notas</p>
            <p className="mt-1 text-sm text-slate-600">{atencion.notas}</p>
          </div>
        )}

        {atencion.fotos.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fotos de seguimiento (orden cronológico)</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {atencion.fotos.map((foto) => (
                <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer" className="block text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.url} alt={formatearFechaFoto(foto.creadoAt)} className="h-24 w-24 rounded-2xl border border-slate-200 object-cover transition hover:opacity-80" />
                  <span className="mt-1 block text-[11px] text-slate-500">{formatearFechaFoto(foto.creadoAt)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function HistoricoAtencionesContent() {
  const searchParams = useSearchParams()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([])
  const [cabinas, setCabinas] = useState<Cabina[]>([])
  const [esteticistas, setEsteticistas] = useState<Esteticista[]>([])
  const [atenciones, setAtenciones] = useState<Atencion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [loading, setLoading] = useState(true)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [detalle, setDetalle] = useState<Atencion | null>(null)
  const [filtros, setFiltros] = useState(() => ({
    clienteId: searchParams.get('clienteId') || '',
    tratamientoId: '',
    cabinaId: '',
    esteticistaId: '',
    estado: '',
    desde: '',
    hasta: '',
  }))

  useEffect(() => {
    Promise.all([
      fetch('/api/clientes').then((res) => res.json()),
      fetch('/api/tratamientos').then((res) => res.json()),
      fetch('/api/cabinas').then((res) => res.json()),
      fetch('/api/usuarios/esteticistas').then((res) => res.json()),
    ]).then(([clientesData, tratamientosData, cabinasData, esteticistasData]) => {
      setClientes(Array.isArray(clientesData) ? clientesData : [])
      setTratamientos(Array.isArray(tratamientosData) ? tratamientosData : [])
      setCabinas(Array.isArray(cabinasData) ? cabinasData : [])
      setEsteticistas(Array.isArray(esteticistasData) ? esteticistasData : [])
    })
  }, [])

  const buscar = async (pageToLoad = 1) => {
    setLoading(true)
    setSinPermiso(false)
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([key, value]) => { if (value) params.set(key, value) })
    params.set('page', String(pageToLoad))
    params.set('pageSize', String(pageSize))
    const response = await fetch(`/api/atenciones?${params.toString()}`)
    if (response.status === 403) {
      setSinPermiso(true)
      setAtenciones([])
      setTotal(0)
      setLoading(false)
      return
    }
    const data = await response.json()
    setAtenciones(Array.isArray(data.items) ? data.items : [])
    setTotal(typeof data.total === 'number' ? data.total : 0)
    setPage(pageToLoad)
    setLoading(false)
  }

  useEffect(() => { void buscar(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Histórico</p>
          <h1 className="mt-3 page-heading text-3xl">Histórico de Atenciones</h1>
          <p className="mt-2 text-slate-600">Filtra por fecha, paciente y tratamiento. Pasa el cursor sobre la cámara para ver fotos y haz clic en una fila para el detalle.</p>
        </div>

        {sinPermiso ? (
          <div className="card-surface">
            <p className="text-sm text-slate-600">No tienes permisos para ver este histórico. Solo administradores y supervisores pueden acceder.</p>
          </div>
        ) : (
          <>
            <div className="card-surface">
              <h2 className="text-xl font-semibold text-emerald-900">Filtros</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Paciente</label>
                  <select value={filtros.clienteId} onChange={(e) => setFiltros((prev) => ({ ...prev, clienteId: e.target.value }))} className="field mt-2">
                    <option value="">Todos</option>
                    {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Tratamiento</label>
                  <select value={filtros.tratamientoId} onChange={(e) => setFiltros((prev) => ({ ...prev, tratamientoId: e.target.value }))} className="field mt-2">
                    <option value="">Todos</option>
                    {tratamientos.map((tratamiento) => <option key={tratamiento.id} value={tratamiento.id}>{tratamiento.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cabina</label>
                  <select value={filtros.cabinaId} onChange={(e) => setFiltros((prev) => ({ ...prev, cabinaId: e.target.value }))} className="field mt-2">
                    <option value="">Todas</option>
                    {cabinas.map((cabina) => <option key={cabina.id} value={cabina.id}>{cabina.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Esteticista</label>
                  <select value={filtros.esteticistaId} onChange={(e) => setFiltros((prev) => ({ ...prev, esteticistaId: e.target.value }))} className="field mt-2">
                    <option value="">Todos</option>
                    {esteticistas.map((esteticista) => <option key={esteticista.id} value={esteticista.id}>{esteticista.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Estado</label>
                  <select value={filtros.estado} onChange={(e) => setFiltros((prev) => ({ ...prev, estado: e.target.value }))} className="field mt-2">
                    <option value="">Todos</option>
                    <option value="EN_CURSO">En curso</option>
                    <option value="FINALIZADA">Finalizada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Filas por página</label>
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="field mt-2">
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Desde</label>
                  <input type="date" value={filtros.desde} onChange={(e) => setFiltros((prev) => ({ ...prev, desde: e.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Hasta</label>
                  <input type="date" value={filtros.hasta} onChange={(e) => setFiltros((prev) => ({ ...prev, hasta: e.target.value }))} className="field mt-2" />
                </div>
              </div>
              <button type="button" onClick={() => void buscar(1)} className="btn-brand mt-5">Filtrar</button>
            </div>

            <div className="card-surface overflow-x-auto">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-emerald-900">Resultados ({total})</h2>
              </div>
              {loading ? (
                <p className="mt-5 text-sm text-slate-500">Cargando...</p>
              ) : atenciones.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">No se encontraron atenciones con estos filtros.</p>
              ) : (
                <>
                  <table className="mt-5 w-full min-w-[840px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-4">Fecha</th>
                        <th className="py-2 pr-4">Paciente</th>
                        <th className="py-2 pr-4">Tratamiento</th>
                        <th className="py-2 pr-4">Costo</th>
                        <th className="py-2 pr-4">Esteticista</th>
                        <th className="py-2 pr-4">Estado</th>
                        <th className="py-2 pr-4 text-center">Fotos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atenciones.map((atencion) => (
                        <tr
                          key={atencion.id}
                          onClick={() => setDetalle(atencion)}
                          className="cursor-pointer border-b border-slate-100 transition hover:bg-emerald-50/50"
                        >
                          <td className="py-3 pr-4">{new Date(atencion.horaInicio).toLocaleString('es-PE')}</td>
                          <td className="py-3 pr-4 font-medium text-slate-900">{atencion.cliente.nombre}</td>
                          <td className="py-3 pr-4">{atencion.tratamiento.nombre}</td>
                          <td className="py-3 pr-4">S/ {atencion.tratamiento.precio.toFixed(2)}</td>
                          <td className="py-3 pr-4">{atencion.esteticista.name}</td>
                          <td className="py-3 pr-4">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">{estadoLabels[atencion.estado]}</span>
                          </td>
                          <td className="py-3 pr-4 text-center"><FotosPreview fotos={atencion.fotos} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-5 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">Página {page} de {totalPages}</p>
                    <div className="flex gap-2">
                      <button type="button" disabled={page <= 1} onClick={() => void buscar(page - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">Anterior</button>
                      <button type="button" disabled={page >= totalPages} onClick={() => void buscar(page + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">Siguiente</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {detalle && <DetalleAtencion atencion={detalle} onClose={() => setDetalle(null)} />}
    </div>
  )
}

export default function HistoricoAtencionesPage() {
  return (
    <Suspense fallback={<div className="page-shell" />}>
      <HistoricoAtencionesContent />
    </Suspense>
  )
}
