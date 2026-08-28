import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { obtenerFacturasPendientes, calcularTotales } from '@/lib/cierres'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const cierres = await prisma.cierreTurno.findMany({
    include: { usuario: true },
    orderBy: { fechaFin: 'desc' },
  })

  return NextResponse.json(cierres)
}

export async function POST() {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  try {
    const cierre = await prisma.$transaction(async (tx) => {
      const facturas = await obtenerFacturasPendientes(tx)
      if (facturas.length === 0) {
        throw new Error('SIN_PENDIENTES')
      }

      const { total, totalesPorMetodo } = calcularTotales(facturas)
      const fechaInicio = facturas[0].creadoAt
      const fechaFin = new Date()

      const creado = await tx.cierreTurno.create({
        data: {
          usuario: { connect: { id: session.user.id } },
          fechaInicio,
          fechaFin,
          totalVentas: total,
          totalEfectivo: totalesPorMetodo.EFECTIVO,
          totalTarjeta: totalesPorMetodo.TARJETA,
          totalYape: totalesPorMetodo.YAPE + totalesPorMetodo.PLIN,
          totalTransferencia: totalesPorMetodo.TRANSFERENCIA,
          totalDeposito: totalesPorMetodo.DEPOSITO,
        },
      })

      await tx.factura.updateMany({
        where: { id: { in: facturas.map((factura) => factura.id) } },
        data: { cierreTurnoId: creado.id },
      })

      return creado
    })

    return NextResponse.json(cierre, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'SIN_PENDIENTES') {
      return NextResponse.json({ error: 'No hay cobros pendientes de cerrar' }, { status: 400 })
    }
    throw error
  }
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  await prisma.cierreTurno.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
