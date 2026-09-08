import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { cerrarSesionSiCorresponde } from '@/lib/atenciones'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  if (body.accion !== 'cancelar') {
    return NextResponse.json({ error: "accion debe ser 'cancelar'" }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const atencion = await prisma.atencion.findUnique({
    where: { id: params.id },
    include: { tratamientos: { select: { id: true, estado: true } } },
  })
  if (!atencion) {
    return NextResponse.json({ error: 'Atención no encontrada' }, { status: 404 })
  }

  const lineasAbiertas = atencion.tratamientos.filter((t) => t.estado === 'PENDIENTE' || t.estado === 'EN_CURSO')
  if (lineasAbiertas.length === 0) {
    return NextResponse.json({ error: 'La atención ya está cerrada' }, { status: 409 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.atencionTratamiento.updateMany({
      where: { id: { in: lineasAbiertas.map((l) => l.id) } },
      data: { estado: 'CANCELADA', horaFin: new Date() },
    })

    await cerrarSesionSiCorresponde(tx, atencion.id, session.user.id)
  })

  return NextResponse.json({ success: true })
}
