import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const TIPOS = ['ENTRADA', 'SALIDA', 'AJUSTE'] as const

export async function GET(req: Request) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const url = new URL(req.url)
  const productoId = url.searchParams.get('productoId')
  if (!productoId) {
    return NextResponse.json({ error: 'productoId requerido' }, { status: 400 })
  }

  const movimientos = await prisma.movimientoInventario.findMany({
    where: { productoId },
    include: { usuario: { select: { id: true, name: true } } },
    orderBy: { creadoAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(movimientos)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const body = await req.json()
  const { productoId, motivo } = body
  const tipoRaw = body.tipo
  const cantidad = Number(body.cantidad)

  if (typeof productoId !== 'string' || !productoId) {
    return NextResponse.json({ error: 'productoId requerido' }, { status: 400 })
  }
  if (typeof tipoRaw !== 'string' || !TIPOS.includes(tipoRaw as (typeof TIPOS)[number])) {
    return NextResponse.json({ error: 'tipo debe ser ENTRADA, SALIDA o AJUSTE' }, { status: 400 })
  }
  const tipo = tipoRaw as (typeof TIPOS)[number]
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return NextResponse.json({ error: 'cantidad debe ser un número mayor o igual a 0' }, { status: 400 })
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({ where: { id: productoId } })
      if (!producto) throw new Error('PRODUCTO_NO_ENCONTRADO')

      const stockAnterior = producto.stock
      let stockNuevo = stockAnterior
      if (tipo === 'ENTRADA') stockNuevo = stockAnterior + cantidad
      if (tipo === 'SALIDA') stockNuevo = stockAnterior - cantidad
      if (tipo === 'AJUSTE') stockNuevo = cantidad

      if (stockNuevo < 0) throw new Error('STOCK_INSUFICIENTE')

      const productoActualizado = await tx.producto.update({
        where: { id: productoId },
        data: { stock: stockNuevo },
      })

      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId,
          tipo,
          cantidad,
          stockAnterior,
          stockNuevo,
          motivo: typeof motivo === 'string' && motivo ? motivo : null,
          usuarioId: session.user.id,
        },
        include: { usuario: { select: { id: true, name: true } } },
      })

      return { producto: productoActualizado, movimiento }
    })

    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCTO_NO_ENCONTRADO') {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'STOCK_INSUFICIENTE') {
      return NextResponse.json({ error: 'La salida deja el stock en negativo' }, { status: 409 })
    }
    throw error
  }
}
