import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { cambiarEstadoCabina } from '@/lib/cabinas'

export const dynamic = 'force-dynamic'

const ESTADOS_VALIDOS = ['DISPONIBLE', 'ATENCION', 'LIMPIEZA', 'MANTENIMIENTO']

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  if (!ESTADOS_VALIDOS.includes(body.estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const cabina = await prisma.cabina.findUnique({ where: { id: params.id } })
  if (!cabina) {
    return NextResponse.json({ error: 'Cabina no encontrada' }, { status: 404 })
  }

  if (cabina.estado === 'ATENCION' && body.estado !== 'ATENCION') {
    return NextResponse.json(
      { error: 'Debes finalizar o cancelar la atención en curso antes de cambiar el estado de la cabina' },
      { status: 409 }
    )
  }

  const updated = await prisma.$transaction((tx) =>
    cambiarEstadoCabina(tx, {
      cabinaId: params.id,
      estadoNuevo: body.estado,
      usuarioId: session.user.id,
      motivo: body.motivo || null,
    })
  )

  return NextResponse.json(updated)
}
