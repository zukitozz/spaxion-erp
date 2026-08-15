import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { atencionActualInclude, mapCabinaConAtencion } from '@/lib/cabinas'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const [citas, cabinas, facturas, pendientes, productos] = await Promise.all([
    prisma.cita.findMany({ where: { fecha: { gte: start, lt: end } }, include: { cliente: true }, orderBy: { fecha: 'asc' } }),
    prisma.cabina.findMany({ orderBy: { nombre: 'asc' }, include: atencionActualInclude }),
    prisma.factura.aggregate({ where: { creadoAt: { gte: start, lt: end } }, _sum: { total: true } }),
    prisma.factura.aggregate({ where: { creadoAt: { gte: start, lt: end }, estado: 'PENDIENTE' }, _sum: { total: true } }),
    prisma.producto.count({ where: { stock: { lte: 5 } } }),
  ])

  return NextResponse.json({
    citas,
    cabinas: cabinas.map(mapCabinaConAtencion),
    totalFacturado: facturas._sum.total || 0,
    totalPendiente: pendientes._sum.total || 0,
    productosStockBajo: productos,
  })
}