import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// Solo el gerente anula un abono registrado por error. Se hace baja lógica (activo:false) para
// conservar la numeración; el saldo del paquete se recalcula solo con los abonos activos.
export async function DELETE(_req: Request, { params }: { params: { id: string; abonoId: string } }) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const abono = await prisma.factura.findUnique({
    where: { id: params.abonoId },
    include: { paquete: { select: { estado: true } } },
  })
  if (!abono || abono.paqueteId !== params.id || abono.tipo !== 'NOTA_VENTA' || !abono.activo) {
    return NextResponse.json({ error: 'Abono no encontrado en este paquete' }, { status: 404 })
  }
  if (abono.paquete?.estado !== 'ABIERTO') {
    return NextResponse.json({ error: 'El paquete ya está cerrado' }, { status: 400 })
  }
  if (abono.cierreTurnoId) {
    return NextResponse.json({ error: 'El abono ya fue incluido en un cierre de turno; elimina el cierre primero' }, { status: 400 })
  }

  await prisma.factura.update({ where: { id: abono.id }, data: { activo: false } })
  return NextResponse.json({ success: true })
}
