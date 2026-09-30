'use client'

import { useEffect, useState } from 'react'
import { ClienteHistorialLink } from '@/components/ClienteHistorialLink'

type ColorEstado = 'HOY' | 'PRONTO' | 'EN_RANGO' | 'LEJANO'

interface Cumpleanos {
  clienteId: string
  nombre: string
  celular: string | null
  email: string | null
  fechaNacimiento: string
  proximoCumpleanos: string
  diasHasta: number
  edadQueCumple: number
  colorEstado: ColorEstado
}

const estiloPorColor: Record<ColorEstado, string> = {
  HOY: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  PRONTO: 'border-amber-200 bg-amber-50 text-amber-900',
  EN_RANGO: 'border-slate-200 bg-slate-50 text-slate-600',
  LEJANO: 'border-slate-100 bg-white text-slate-400',
}

const etiquetaPorColor: Record<ColorEstado, string> = {
  HOY: '¡Hoy!',
  PRONTO: 'Esta semana',
  EN_RANGO: 'Este mes',
  LEJANO: 'Próximamente',
}

function normalizarWhatsapp(telefono: string) {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length === 9) return `51${digitos}`
  return digitos
}

function formatearDiasHasta(dias: number) {
  if (dias === 0) return 'Cumple hoy'
  if (dias === 1) return 'Cumple mañana'
  return `Faltan ${dias} días`
}

export default function CumpleanosPage() {
  const [clientes, setClientes] = useState<Cumpleanos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/cumpleanos')
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'No se pudo cargar la lista de cumpleaños')
        setClientes(Array.isArray(data) ? data : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la lista de cumpleaños')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Cumpleaños</p>
          <h1 className="mt-3 page-heading text-3xl">Cumpleaños de clientes</h1>
          <p className="mt-2 text-slate-600">Clientes ordenados por proximidad de su próximo cumpleaños.</p>
        </div>

        <div className="card-surface overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando clientes...</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : clientes.length === 0 ? (
            <p className="text-sm text-slate-500">Ningún cliente tiene fecha de nacimiento registrada.</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Cumpleaños</th>
                  <th className="py-2 pr-4">Cumple años</th>
                  <th className="py-2 pr-4">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.clienteId} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      <ClienteHistorialLink clienteId={cliente.clienteId} nombre={cliente.nombre} />
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${estiloPorColor[cliente.colorEstado]}`}>
                        {etiquetaPorColor[cliente.colorEstado]}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(cliente.proximoCumpleanos).toLocaleDateString('es-PE', { day: '2-digit', month: 'long' })} · {formatearDiasHasta(cliente.diasHasta)}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{cliente.edadQueCumple} años</td>
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
