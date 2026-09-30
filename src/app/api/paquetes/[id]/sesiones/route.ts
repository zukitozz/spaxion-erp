import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { registrarSesion, PaqueteError } from '@/lib/paquetes'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario autenticado requerido' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  try {
    const sesion = await registrarSesion({
      paqueteId: params.id,
      fecha: typeof body.fecha === 'string' ? body.fecha : undefined,
      notas: typeof body.notas === 'string' ? body.notas : undefined,
      usuarioId: session.user.id,
    })
    return NextResponse.json(sesion, { status: 201 })
  } catch (error) {
    if (error instanceof PaqueteError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const mensaje = error instanceof Error ? error.message : 'No se pudo registrar la sesión'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
