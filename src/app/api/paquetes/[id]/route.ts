import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { calcularSaldo } from '@/lib/paquetes'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const paquete = await prisma.paquete.findUnique({
    where: { id: params.id },
    include: {
      cliente: { select: { id: true, nombre: true, dni: true, ruc: true, razonSocial: true } },
      tratamiento: { select: { id: true, nombre: true } },
      // Todos los abonos (activos e inactivos) para poder mostrar el histórico completo del paquete.
      facturas: {
        where: { tipo: 'NOTA_VENTA' },
        orderBy: { creadoAt: 'asc' },
      },
    },
  })
  if (!paquete) {
    return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
  }

  const comprobanteFinal = await prisma.factura.findFirst({
    where: { paqueteId: paquete.id, tipo: { not: 'NOTA_VENTA' } },
    include: { items: true },
  })

  const abonosActivos = paquete.facturas.filter((factura) => factura.activo)
  const { pagado, saldo } = calcularSaldo(paquete.precioTotal, abonosActivos)

  return NextResponse.json({ ...paquete, pagado, saldo, comprobanteFinal })
}
