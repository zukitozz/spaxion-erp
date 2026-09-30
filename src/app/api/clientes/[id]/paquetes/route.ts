import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { calcularSaldo } from '@/lib/paquetes'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const paquetes = await prisma.paquete.findMany({
    where: { clienteId: params.id, activo: true },
    include: {
      tratamiento: { select: { id: true, nombre: true } },
      facturas: { where: { tipo: 'NOTA_VENTA', activo: true } },
      sesiones: { orderBy: { numero: 'asc' } },
    },
    orderBy: { creadoAt: 'desc' },
  })

  const resultado = paquetes.map((paquete) => ({ ...paquete, ...calcularSaldo(paquete.precioTotal, paquete.facturas) }))

  return NextResponse.json(resultado)
}
