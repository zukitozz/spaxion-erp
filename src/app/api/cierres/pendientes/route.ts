import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { obtenerFacturasPendientes, calcularTotales } from '@/lib/cierres'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const facturas = await obtenerFacturasPendientes(prisma)
  const { total, totalesPorMetodo } = calcularTotales(facturas)

  return NextResponse.json({
    facturas,
    totalesPorMetodo,
    total,
    fechaDesde: facturas[0]?.creadoAt ?? null,
  })
}
