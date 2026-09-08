import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { listarAtencionesEnCurso } from '@/lib/atenciones'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const [citas, atencionesEnCurso, facturas, pendientes, productos] = await Promise.all([
    prisma.cita.findMany({ where: { fecha: { gte: start, lt: end } }, include: { cliente: true }, orderBy: { fecha: 'asc' } }),
    listarAtencionesEnCurso(session.user.role, session.user.id),
    prisma.factura.aggregate({ where: { creadoAt: { gte: start, lt: end }, activo: true }, _sum: { total: true } }),
    prisma.factura.aggregate({ where: { creadoAt: { gte: start, lt: end }, estado: 'PENDIENTE', activo: true }, _sum: { total: true } }),
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
