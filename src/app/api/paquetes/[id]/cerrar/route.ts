import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { emitirComprobanteFinal, PaqueteError } from '@/lib/paquetes'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario autenticado requerido' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR') {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const body = await req.json()
  const tipo = body.tipo
  const notaIds: string[] = Array.isArray(body.notaIds) ? body.notaIds.filter((id: unknown) => typeof id === 'string') : []

  if (tipo !== 'BOLETA' && tipo !== 'FACTURA') {
    return NextResponse.json({ error: 'tipo debe ser BOLETA o FACTURA' }, { status: 400 })
  }

  try {
    const factura = await emitirComprobanteFinal({
      paqueteId: params.id,
      notaIds,
      tipo,
      usuarioId: session.user.id,
    })
    if (!factura.enviado && factura.tipo !== 'NOTA_VENTA') {
      return NextResponse.json({ error: factura.errors, factura }, { status: 502 })
    }
    return NextResponse.json(factura, { status: 201 })
  } catch (error) {
    if (error instanceof PaqueteError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const mensaje = error instanceof Error ? error.message : 'No se pudo emitir el comprobante final'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
