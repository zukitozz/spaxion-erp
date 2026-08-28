'use client'

import { useEffect, useState } from 'react'
import { CabinaCard, type AtencionActual, type CabinaEstado } from '@/components/CabinaCard'
import { Modal } from '@/components/Modal'
import { CabinaAtencionPanel } from '@/components/CabinaAtencionPanel'
import { useToast } from '@/components/Toast'

interface Cabina {
  id: string
  nombre: string
  estado: CabinaEstado
  atencionActual: AtencionActual | null
}

const estados: CabinaEstado[] = ['DISPONIBLE', 'ATENCION', 'LIMPIEZA', 'MANTENIMIENTO']

export default function CabinasPage() {
  const toast = useToast()
  const [cabinas, setCabinas] = useState<Cabina[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ nombre: string; estado: CabinaEstado }>({ nombre: '', estado: 'DISPONIBLE' })
  const [submitting, setSubmitting] = useState(false)
  const [selectedCabinaId, setSelectedCabinaId] = useState<string | null>(null)

  const load = async () => {
    const response = await fetch('/api/cabinas')
    const data = await response.json()
    setCabinas(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.nombre) return
    setSubmitting(true)
    const response = await fetch('/api/cabinas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const created = await response.json()
    setSubmitting(false)
    if (!response.ok) {
      toast.error(created.error || 'No se pudo crear la cabina')
      return
    }
    setCabinas((prev) => [{ ...created, atencionActual: null }, ...prev])
    setForm({ nombre: '', estado: 'DISPONIBLE' })
    toast.success('Cabina creada')
  }

  const cabinaSeleccionada = cabinas.find((cabina) => cabina.id === selectedCabinaId) ?? null

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Cabinas</p>
          <h1 className="page-heading mt-3 text-3xl">Estado en tiempo real</h1>
          <p className="mt-2 text-slate-600">Matricula cabinas y controla su estado en tiempo real.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card-surface">
            <h2 className="text-xl font-bold text-[#173d36]">Crear cabina</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  className="field mt-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Estado inicial</label>
                <select
                  value={form.estado}
                  onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value as CabinaEstado }))}
                  className="field mt-2"
                >
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="btn-brand w-full disabled:opacity-60"
              >
                {submitting ? 'Creando...' : 'Agregar cabina'}
              </button>
            </div>
          </div>

          <div className="card-surface">
            <h2 className="text-xl font-bold text-[#173d36]">Resumen</h2>
            <p className="mt-4 text-sm text-slate-600">Total de cabinas: {cabinas.length}</p>
            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="rounded-2xl bg-[#f9faf8] p-5">Cargando cabinas...</div>
              ) : cabinas.length === 0 ? (
                <div className="rounded-2xl bg-[#f9faf8] p-5">No hay cabinas registradas.</div>
              ) : (
                cabinas.map((cabina) => (
                  <div key={cabina.id} className="rounded-2xl border border-[#eef1ec] bg-[#fdfdfb] p-4">
                    <p className="font-bold text-[#173d36]">{cabina.nombre}</p>
                    <p className="mt-1 text-sm text-slate-500">Estado: {cabina.estado}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cabinas.map((cabina) => (
            <CabinaCard
              key={cabina.id}
              nombre={cabina.nombre}
              estado={cabina.estado}
              atencionActual={cabina.atencionActual}
              onClick={() => setSelectedCabinaId(cabina.id)}
            />
          ))}
        </section>
      </div>

      {cabinaSeleccionada && (
        <Modal title={cabinaSeleccionada.nombre} onClose={() => setSelectedCabinaId(null)}>
          <CabinaAtencionPanel
            cabina={cabinaSeleccionada}
            onClose={() => setSelectedCabinaId(null)}
            onChanged={() => { void load(); setSelectedCabinaId(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
