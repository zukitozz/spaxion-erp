'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { useToast } from '@/components/Toast'

interface Cliente {
  id: string
  nombre: string
  dni: string | null
  ruc: string | null
  carnetExtranjeria: string | null
  razonSocial: string | null
  celular: string | null
  distrito: string | null
  email: string | null
  fechaNacimiento: string | null
  peso: number | null
  edad: number | null
  altura: number | null
  notas: string | null
}

const PAGE_SIZE = 10

const emptyForm = {
  nombre: '', dni: '', ruc: '', carnetExtranjeria: '', razonSocial: '', celular: '', distrito: '',
  email: '', fechaNacimiento: '', peso: '', edad: '', altura: '', notas: '',
}

function documentLabel(cliente: Cliente) {
  if (cliente.dni) return `DNI ${cliente.dni}`
  if (cliente.ruc) return `RUC ${cliente.ruc}`
  if (cliente.carnetExtranjeria) return `CE ${cliente.carnetExtranjeria}`
  return 'Sin documento'
}

export default function ClientesPage() {
  const toast = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'ruc'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  useEffect(() => {
    fetch('/api/clientes')
      .then((res) => res.json())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .finally(() => setCargando(false))
  }, [])

  const clientesFiltrados = useMemo(() => {
    const base = filtro === 'ruc' ? clientes.filter((cliente) => cliente.ruc) : clientes
    const query = busqueda.trim().toLowerCase()
    if (!query) return base
    return base.filter((cliente) =>
      cliente.nombre.toLowerCase().includes(query) ||
      (cliente.dni || '').includes(query) ||
      (cliente.ruc || '').includes(query) ||
      (cliente.carnetExtranjeria || '').includes(query),
    )
  }, [clientes, filtro, busqueda])

  const totalPages = Math.max(1, Math.ceil(clientesFiltrados.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, totalPages)
  const clientesPagina = clientesFiltrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)

  useEffect(() => { setPagina(1) }, [busqueda, filtro])

  const abrirNuevo = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMostrarFormulario(true)
  }

  const abrirEdicion = (cliente: Cliente) => {
    setEditingId(cliente.id)
    setForm({
      nombre: cliente.nombre,
      dni: cliente.dni || '',
      ruc: cliente.ruc || '',
      carnetExtranjeria: cliente.carnetExtranjeria || '',
      razonSocial: cliente.razonSocial || '',
      celular: cliente.celular || '',
      distrito: cliente.distrito || '',
      email: cliente.email || '',
      fechaNacimiento: cliente.fechaNacimiento ? cliente.fechaNacimiento.slice(0, 10) : '',
      peso: cliente.peso?.toString() || '',
      edad: cliente.edad?.toString() || '',
      altura: cliente.altura?.toString() || '',
      notas: cliente.notas || '',
    })
    setMostrarFormulario(true)
  }

  const handleGuardar = async () => {
    const dni = form.dni.trim()
    const dniDuplicado = dni && clientes.some((cliente) => cliente.dni?.trim() === dni && cliente.id !== editingId)

    if (dniDuplicado) {
      toast.error('El DNI ya está registrado en otro cliente')
      return
    }

    setLoading(true)

    const response = await fetch('/api/clientes', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        id: editingId || undefined,
        peso: form.peso ? Number(form.peso) : undefined,
        edad: form.edad ? Number(form.edad) : undefined,
        altura: form.altura ? Number(form.altura) : undefined,
        fechaNacimiento: form.fechaNacimiento || undefined,
      }),
    })

    const result = await response.json()
    setLoading(false)
    if (!response.ok) {
      toast.error(result.error || 'No se pudo guardar el cliente')
      return
    }

    setClientes((prev) => (editingId ? prev.map((item) => (item.id === editingId ? result : item)) : [result, ...prev]))
    setMostrarFormulario(false)
    toast.success(editingId ? 'Cliente actualizado' : 'Cliente creado')
  }

  const handleEliminar = async (id: string) => {
    const response = await fetch(`/api/clientes?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      toast.error(data?.error || 'No se pudo eliminar el cliente')
      return
    }
    setClientes((prev) => prev.filter((item) => item.id !== id))
    toast.success('Cliente eliminado')
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Clientes</p>
          <h1 className="page-heading mt-3 text-3xl">Registro y gestión</h1>
          <p className="mt-2 text-slate-600">Registra clientes y consulta su historial para check-in rápido.</p>
        </div>

        <div className="card-surface">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-[#173d36]">Clientes registrados</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltro('todos')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${filtro === 'todos' ? 'bg-[#173d36] text-[#fffdf7]' : 'bg-[#f1f5f4] text-slate-600'}`}
                >Todos</button>
                <button
                  type="button"
                  onClick={() => setFiltro('ruc')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${filtro === 'ruc' ? 'bg-[#173d36] text-[#fffdf7]' : 'bg-[#f1f5f4] text-slate-600'}`}
                >Con RUC</button>
              </div>
              <button type="button" onClick={abrirNuevo} className="rounded-full bg-[#00483f] px-5 py-2 text-sm font-bold text-white transition hover:brightness-110">+ Nuevo cliente</button>
            </div>
          </div>

          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, DNI o RUC..."
            className="field mt-4"
          />

          <div className="mt-6">
            {cargando ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando clientes...</p>
            ) : clientesPagina.length === 0 ? (
              <p className="text-sm text-slate-500">No se encontraron clientes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Nombre</th>
                      <th className="pb-3 pr-4">Documento</th>
                      <th className="pb-3 pr-4">Celular</th>
                      <th className="pb-3 pr-4">Distrito</th>
                      <th className="pb-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesPagina.map((cliente) => (
                      <tr key={cliente.id} className="border-t border-[#eef1ec]">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ecf8f2] text-xs font-extrabold text-[#1d6f50]">
                              {cliente.nombre.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#173d36]">{cliente.nombre}</p>
                              {cliente.ruc && <span className="rounded-full bg-[#f5efe4] px-2 py-0.5 text-[10px] font-extrabold text-[#9a7e62]">Factura</span>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{documentLabel(cliente)}</td>
                        <td className="py-3 pr-4 text-slate-600">{cliente.celular || '—'}</td>
                        <td className="py-3 pr-4 text-slate-600">{cliente.distrito || '—'}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link href={`/historico/atenciones?clienteId=${cliente.id}`} className="text-sm font-semibold text-[#1d6f50]">Historial</Link>
                            <button type="button" onClick={() => abrirEdicion(cliente)} className="text-sm font-semibold text-emerald-700">Editar</button>
                            <button type="button" onClick={() => void handleEliminar(cliente.id)} className="text-sm font-semibold text-rose-600">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Pagination page={paginaActual} totalPages={totalPages} onChange={setPagina} />
        </div>
      </div>

      {mostrarFormulario && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
        >
          <div className="card-surface w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[#173d36]">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Cerrar"
              >✕</button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="cliente-nombre" className="block text-sm font-medium text-slate-700">Nombre</label>
                <input id="cliente-nombre" value={form.nombre} onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))} className="field mt-2" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="cliente-dni" className="block text-sm font-medium text-slate-700">DNI</label>
                  <input id="cliente-dni" value={form.dni} onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))} className="field mt-2" placeholder="Para boleta" />
                </div>
                <div>
                  <label htmlFor="cliente-carnet-extranjeria" className="block text-sm font-medium text-slate-700">Carnet de extranjería</label>
                  <input id="cliente-carnet-extranjeria" value={form.carnetExtranjeria} onChange={(event) => setForm((prev) => ({ ...prev, carnetExtranjeria: event.target.value }))} className="field mt-2" placeholder="Para boleta" />
                </div>
                <div>
                  <label htmlFor="cliente-ruc" className="block text-sm font-medium text-slate-700">RUC</label>
                  <input id="cliente-ruc" value={form.ruc} onChange={(event) => setForm((prev) => ({ ...prev, ruc: event.target.value }))} className="field mt-2" placeholder="Para factura" />
                </div>
              </div>

              <div>
                <label htmlFor="cliente-razon-social" className="block text-sm font-medium text-slate-700">Razón social</label>
                <input id="cliente-razon-social" value={form.razonSocial} onChange={(event) => setForm((prev) => ({ ...prev, razonSocial: event.target.value }))} className="field mt-2" placeholder="Requerido para emitir factura" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cliente-celular" className="block text-sm font-medium text-slate-700">Celular</label>
                  <input id="cliente-celular" value={form.celular} onChange={(event) => setForm((prev) => ({ ...prev, celular: event.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="cliente-distrito" className="block text-sm font-medium text-slate-700">Distrito</label>
                  <input id="cliente-distrito" value={form.distrito} onChange={(event) => setForm((prev) => ({ ...prev, distrito: event.target.value }))} className="field mt-2" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cliente-email" className="block text-sm font-medium text-slate-700">Email</label>
                  <input id="cliente-email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="cliente-fecha-nacimiento" className="block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                  <input id="cliente-fecha-nacimiento" type="date" value={form.fechaNacimiento} onChange={(event) => setForm((prev) => ({ ...prev, fechaNacimiento: event.target.value }))} className="field mt-2" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="cliente-peso" className="block text-sm font-medium text-slate-700">Peso (kg)</label>
                  <input id="cliente-peso" type="number" value={form.peso} onChange={(event) => setForm((prev) => ({ ...prev, peso: event.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="cliente-edad" className="block text-sm font-medium text-slate-700">Edad</label>
                  <input id="cliente-edad" type="number" value={form.edad} onChange={(event) => setForm((prev) => ({ ...prev, edad: event.target.value }))} className="field mt-2" />
                </div>
                <div>
                  <label htmlFor="cliente-altura" className="block text-sm font-medium text-slate-700">Altura (cm)</label>
                  <input id="cliente-altura" type="number" value={form.altura} onChange={(event) => setForm((prev) => ({ ...prev, altura: event.target.value }))} className="field mt-2" />
                </div>
              </div>

              <div>
                <label htmlFor="cliente-notas" className="block text-sm font-medium text-slate-700">Notas</label>
                <input id="cliente-notas" value={form.notas} onChange={(event) => setForm((prev) => ({ ...prev, notas: event.target.value }))} className="field mt-2" />
              </div>

              <button
                type="button"
                disabled={loading || !form.nombre}
                onClick={() => void handleGuardar()}
                className="btn-brand flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Spinner />}
                {loading ? 'Guardando...' : editingId ? 'Actualizar cliente' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
