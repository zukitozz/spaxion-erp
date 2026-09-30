import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { eliminarSesion, PaqueteError } from '@/lib/paquetes'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: { id: string; sesionId: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario autenticado requerido' }, { status: 401 })
  }

  try {
    await eliminarSesion({ paqueteId: params.id, sesionId: params.sesionId })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PaqueteError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const mensaje = error instanceof Error ? error.message : 'No se pudo eliminar la sesión'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
