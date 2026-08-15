import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const pendientes = await prisma.atencionCabina.findMany({
    where: { clienteId: params.id, estado: 'FINALIZADA', facturaId: null },
    include: {
      cabina: { select: { id: true, nombre: true } },
      tratamiento: { select: { id: true, nombre: true, precio: true } },
      esteticista: { select: { id: true, name: true } },
      productos: { include: { producto: { select: { id: true, nombre: true } } }, orderBy: { creadoAt: 'asc' } },
    },
    orderBy: { horaInicio: 'asc' },
  })

  return NextResponse.json(pendientes)
}
