'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Spinner } from '@/components/Spinner'

interface ReporteMensual {
  mes: string
  ingresos: { total: number; totalesPorMetodo: Record<string, number> }
  gastos: { total: number; porCategoria: { categoria: string; total: number }[] }
  diferencia: number
}

const metodoLabels: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE: 'Yape / Plin',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito',
}

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ReporteMensualPage() {
  const [mes, setMes] = useState(mesActual())
  const [reporte, setReporte] = useState<ReporteMensual | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    fetch(`/api/reportes/mensual?mes=${mes}`)
      .then((res) => res.json())
      .then((data) => setReporte(data))
      .finally(() => setCargando(false))
  }, [mes])

  const diferenciaPositiva = (reporte?.diferencia ?? 0) >= 0

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Reportes</p>
          <h1 className="mt-3 page-heading text-3xl">Reporte mensual</h1>
          <p className="mt-2 text-slate-600">Solo para gerente: compara ingresos y gastos del mes para ver la utilidad.</p>
          <Link href="/reportes" className="btn-brand mt-5 inline-flex">Ver cierres de turno</Link>
        </div>

        <div className="card-surface">
          <label className="block text-sm font-medium text-slate-700">Mes</label>
          <input
            type="month"
            value={mes}
            onChange={(event) => setMes(event.target.value)}
            className="field mt-2 max-w-xs"
          />
        </div>

        {cargando || !reporte ? (
          <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Cargando reporte...</p>
        ) : (
          <>
            <div className={`card-surface border-2 ${diferenciaPositiva ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
              <p className="eyebrow">Utilidad del mes</p>
              <p className={`mt-2 text-4xl font-bold ${diferenciaPositiva ? 'text-emerald-900' : 'text-rose-700'}`}>
                S/ {reporte.diferencia.toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Ingresos S/ {reporte.ingresos.total.toFixed(2)} − Gastos S/ {reporte.gastos.total.toFixed(2)}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card-surface">
                <h2 className="text-xl font-semibold text-emerald-900">Ingresos por método de pago</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {Object.entries(reporte.ingresos.totalesPorMetodo)
                    .filter(([metodo]) => metodo !== 'PLIN')
                    .map(([metodo, valor]) => (
                      <div key={metodo} className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metodoLabels[metodo] || metodo}</p>
                        <p className="mt-2 text-lg font-semibold text-emerald-900">S/ {valor.toFixed(2)}</p>
                      </div>
                    ))}
                </div>
                <p className="mt-5 text-sm text-slate-600">Total ingresos: <span className="font-semibold text-emerald-900">S/ {reporte.ingresos.total.toFixed(2)}</span></p>
              </div>

              <div className="card-surface">
                <h2 className="text-xl font-semibold text-emerald-900">Gastos por categoría</h2>
                {reporte.gastos.porCategoria.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No hay gastos registrados este mes.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {reporte.gastos.porCategoria.map((item) => (
                      <div key={item.categoria} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm">
                        <span className="font-medium text-slate-900">{item.categoria}</span>
                        <span className="font-semibold text-slate-700">S/ {item.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-5 text-sm text-slate-600">Total gastos: <span className="font-semibold text-rose-700">S/ {reporte.gastos.total.toFixed(2)}</span></p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
