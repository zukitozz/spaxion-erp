import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const include = {
  cabina: { select: { id: true, nombre: true } },
  cliente: { select: { id: true, nombre: true } },
  tratamiento: { select: { id: true, nombre: true, diasProximoTratamiento: true } },
  esteticista: { select: { id: true, name: true } },
}

export async function GET() {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'ESTETICISTA'])
  if (guard) return guard

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const where =
    session.user.role === 'ESTETICISTA'
      ? { estado: 'EN_CURSO' as const, esteticistaId: session.user.id }
      : { estado: 'EN_CURSO' as const }

  const atenciones = await prisma.atencionCabina.findMany({
    where,
    include,
    orderBy: { horaInicio: 'asc' },
  })

  return NextResponse.json(atenciones)
}
