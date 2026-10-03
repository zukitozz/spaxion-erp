import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { listarAtencionesEnCurso } from '@/lib/atenciones'
import { hoyPeru, rangoDiaPeru } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const { gte: start, lte: end } = rangoDiaPeru(hoyPeru())

  const [citas, atencionesEnCurso, facturas, pendientes, productos] = await Promise.all([
    prisma.cita.findMany({ where: { fecha: { gte: start, lte: end } }, include: { cliente: true }, orderBy: { fecha: 'asc' } }),
    listarAtencionesEnCurso(session.user.role, session.user.id),
    prisma.factura.aggregate({ where: { creadoAt: { gte: start, lte: end }, activo: true }, _sum: { total: true } }),
    prisma.factura.aggregate({ where: { creadoAt: { gte: start, lte: end }, estado: 'PENDIENTE', activo: true }, _sum: { total: true } }),
    prisma.producto.count({ where: { stock: { lte: 5 } } }),
  ])

  return NextResponse.json({
    citas,
    atencionesEnCurso,
    totalFacturado: facturas._sum.total || 0,
    totalPendiente: pendientes._sum.total || 0,
    productosStockBajo: productos,
  })
}
