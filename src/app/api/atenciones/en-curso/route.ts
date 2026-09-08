import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { listarAtencionesEnCurso } from '@/lib/atenciones'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'ESTETICISTA'])
  if (guard) return guard

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const atenciones = await listarAtencionesEnCurso(session.user.role, session.user.id)

  return NextResponse.json(atenciones)
}
