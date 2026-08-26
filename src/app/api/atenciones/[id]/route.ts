import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { cambiarEstadoCabina } from '@/lib/cabinas'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'OPERADOR'])
  if (guard) return guard

  const body = await req.json()
  if (body.accion !== 'finalizar' && body.accion !== 'cancelar') {
    return NextResponse.json({ error: "accion debe ser 'finalizar' o 'cancelar'" }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const atencionActual = await prisma.atencionCabina.findUnique({ where: { id: params.id } })
  if (!atencionActual) {
    return NextResponse.json({ error: 'Atención no encontrada' }, { status: 404 })
  }
  if (atencionActual.estado !== 'EN_CURSO') {
    return NextResponse.json({ error: 'La atención ya no está en curso' }, { status: 409 })
  }

  const nuevoEstadoAtencion = body.accion === 'finalizar' ? 'FINALIZADA' : 'CANCELADA'
  const nuevoEstadoCabina = body.accion === 'finalizar' ? 'LIMPIEZA' : 'DISPONIBLE'

  let diasProximoTratamiento: number | null | undefined
  if (body.accion === 'finalizar' && body.diasProximoTratamiento !== undefined) {
    const dias = Number(body.diasProximoTratamiento)
    diasProximoTratamiento = Number.isFinite(dias) && dias > 0 ? Math.round(dias) : null
  }

  const atencion = await prisma.$transaction(async (tx) => {
    const actualizada = await tx.atencionCabina.update({
      where: { id: params.id },
      data: {
        estado: nuevoEstadoAtencion,
        horaFin: new Date(),
        notas: body.notas ?? atencionActual.notas,
        diasProximoTratamiento,
      },
    })

    await cambiarEstadoCabina(tx, {
      cabinaId: atencionActual.cabinaId,
      estadoNuevo: nuevoEstadoCabina,
      usuarioId: session.user.id,
      atencionId: atencionActual.id,
    })

    if (body.accion === 'finalizar' && atencionActual.citaId) {
      await tx.cita.update({
        where: { id: atencionActual.citaId },
        data: { estado: 'ATENDIDA', registrado: true },
      })
    }

    return actualizada
  })

  return NextResponse.json(atencion)
}
