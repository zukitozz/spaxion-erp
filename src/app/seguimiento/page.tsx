'use client'

import { useEffect, useState } from 'react'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'
import { useToast } from '@/components/Toast'

type ColorEstado = 'VENCIDO' | 'PRONTO' | 'EN_RANGO' | 'SIN_DATO'

interface SeguimientoCliente {
  clienteId: string
  nombre: string
  celular: string | null
  tratamiento: string | null
  fechaSugerida: string | null
  diasRestantes: number | null
  colorEstado: ColorEstado
}

const estiloPorColor: Record<ColorEstado, string> = {
  VENCIDO: 'border-rose-200 bg-rose-50 text-rose-900',
  PRONTO: 'border-amber-200 bg-amber-50 text-amber-900',
  EN_RANGO: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  SIN_DATO: 'border-slate-200 bg-slate-50 text-slate-500',
}

const etiquetaPorColor: Record<ColorEstado, string> = {
  VENCIDO: 'Contactar ahora',
  PRONTO: 'Contactar pronto',
  EN_RANGO: 'En rango',
  SIN_DATO: 'Sin dato',
}

function normalizarWhatsapp(telefono: string) {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length === 9) return `51${digitos}`
  return digitos
}

function formatearDiasRestantes(dias: number | null) {
  if (dias === null) return 'Sin tratamiento con días sugeridos'
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Vence hoy'
  return `Faltan ${dias} día${dias === 1 ? '' : 's'}`
}

export default function SeguimientoPage() {
  const toast = useToast()
  const [clientes, setClientes] = useState<SeguimientoCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posponiendoId, setPosponiendoId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/seguimiento')
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'No se pudo cargar el seguimiento')
      setClientes(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el seguimiento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const posponer = async (clienteId: string, dias: number) => {
    setPosponiendoId(clienteId)
    const response = await fetch(`/api/seguimiento/${clienteId}/posponer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias }),
    })
    setPosponiendoId(null)
    if (!response.ok) {
      toast.error('No se pudo posponer el aviso')
      return
    }
    await load()
    toast.success(`Aviso pospuesto ${dias} días`)
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Seguimiento</p>
          <h1 className="mt-3 page-heading text-3xl">Seguimiento de clientes</h1>
          <p className="mt-2 text-slate-600">Clientes ordenados por urgencia de contacto según los días sugeridos para repetir su tratamiento.</p>
        </div>

        <div className="card-surface overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando clientes...</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : clientes.length === 0 ? (
            <p className="text-sm text-slate-500">No hay clientes registrados.</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Tratamiento</th>
                  <th className="py-2 pr-4">Días restantes</th>
                  <th className="py-2 pr-4">Teléfono</th>
                  <th className="py-2 pr-4">Posponer aviso</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.clienteId} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      <ClienteHistorialLink clienteId={cliente.clienteId} nombre={cliente.nombre} />
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{cliente.tratamiento || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${estiloPorColor[cliente.colorEstado]}`}>
                        {etiquetaPorColor[cliente.colorEstado]}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">{formatearDiasRestantes(cliente.diasRestantes)}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {cliente.celular ? (
                        <div className="flex flex-col gap-1 text-xs">
                          <a href={`tel:${cliente.celular}`} className="font-semibold text-slate-700 underline decoration-dotted underline-offset-2 hover:text-emerald-700">
                            {cliente.celular}
                          </a>
                          <a
                            href={`https://wa.me/${normalizarWhatsapp(cliente.celular)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-emerald-700 underline decoration-dotted underline-offset-2 hover:text-emerald-900"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sin teléfono</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-2">
                        {[7, 15, 30].map((dias) => (
                          <button
                            key={dias}
                            type="button"
                            disabled={posponiendoId === cliente.clienteId}
                            onClick={() => void posponer(cliente.clienteId, dias)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            +{dias}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
