import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { cerrarSesionSiCorresponde } from '@/lib/atenciones'

export const dynamic = 'force-dynamic'

const ACCIONES = ['iniciar', 'finalizar', 'cancelar'] as const

export async function PATCH(req: Request, { params }: { params: { id: string; lineaId: string } }) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'ESTETICISTA'])
  if (guard) return guard

  const body = await req.json()
  if (!ACCIONES.includes(body.accion)) {
    return NextResponse.json({ error: "accion debe ser 'iniciar', 'finalizar' o 'cancelar'" }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const linea = await prisma.atencionTratamiento.findUnique({ where: { id: params.lineaId } })
  if (!linea || linea.atencionId !== params.id) {
    return NextResponse.json({ error: 'Tratamiento no encontrado' }, { status: 404 })
  }

  if (session.user.role === 'ESTETICISTA' && linea.esteticistaId !== session.user.id) {
    return NextResponse.json({ error: 'Solo la esteticista asignada puede gestionar este tratamiento' }, { status: 403 })
  }

  if (body.accion === 'iniciar' && linea.estado !== 'PENDIENTE') {
    return NextResponse.json({ error: 'El tratamiento ya fue iniciado' }, { status: 409 })
  }
  if (body.accion === 'finalizar' && linea.estado !== 'EN_CURSO') {
    return NextResponse.json({ error: 'Primero debes iniciar el tratamiento' }, { status: 409 })
  }
  if (body.accion === 'cancelar' && (linea.estado === 'FINALIZADA' || linea.estado === 'CANCELADA')) {
    return NextResponse.json({ error: 'El tratamiento ya está cerrado' }, { status: 409 })
  }

  let diasProximoTratamiento: number | null | undefined
  if (body.accion === 'finalizar' && body.diasProximoTratamiento !== undefined) {
    const dias = Number(body.diasProximoTratamiento)
    diasProximoTratamiento = Number.isFinite(dias) && dias > 0 ? Math.round(dias) : null
  }

  const data =
    body.accion === 'iniciar'
      ? { estado: 'EN_CURSO' as const, horaInicio: new Date() }
      : body.accion === 'finalizar'
        ? { estado: 'FINALIZADA' as const, horaFin: new Date(), diasProximoTratamiento }
        : { estado: 'CANCELADA' as const, horaFin: new Date() }

  const actualizada = await prisma.$transaction(async (tx) => {
    const resultado = await tx.atencionTratamiento.update({ where: { id: linea.id }, data })

    if (body.accion === 'finalizar' || body.accion === 'cancelar') {
      await cerrarSesionSiCorresponde(tx, linea.atencionId, session.user.id)
    }

    return resultado
  })

  return NextResponse.json(actualizada)
}
