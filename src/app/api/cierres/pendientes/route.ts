import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { obtenerGastosPendientes } from '@/lib/comisiones'
import { obtenerFacturasPendientes, calcularTotales } from '@/lib/cierres'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const facturas = await obtenerFacturasPendientes(prisma)
  const { total, totalesPorMetodo } = calcularTotales(facturas)
  const gastos = await obtenerGastosPendientes(prisma)
  const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0)

  return NextResponse.json({
    facturas,
    totalesPorMetodo,
    total,
    gastos,
    totalGastos,
    fechaDesde: facturas[0]?.creadoAt ?? null,
  })
}
