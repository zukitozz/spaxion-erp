import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const ROLES_ATENCION = ['ADMIN', 'SUPERVISOR', 'OPERADOR'] as const

const include = {
  producto: { select: { id: true, nombre: true } },
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const productos = await prisma.atencionProducto.findMany({
    where: { atencionId: params.id },
    include,
    orderBy: { creadoAt: 'asc' },
  })

  return NextResponse.json(productos)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth([...ROLES_ATENCION])
  if (guard) return guard

  const atencion = await prisma.atencionCabina.findUnique({ where: { id: params.id } })
  if (!atencion) {
    return NextResponse.json({ error: 'Atención no encontrada' }, { status: 404 })
  }
  if (atencion.facturaId) {
    return NextResponse.json({ error: 'Esta atención ya fue facturada' }, { status: 409 })
  }
  if (atencion.estado === 'CANCELADA') {
    return NextResponse.json({ error: 'La atención está cancelada' }, { status: 409 })
  }

  const body = await req.json()
  const cantidad = Number(body.cantidad) || 0
  if (typeof body.productoId !== 'string' || !body.productoId || cantidad <= 0) {
    return NextResponse.json({ error: 'productoId y cantidad (mayor a 0) son requeridos' }, { status: 400 })
  }

  const producto = await prisma.producto.findUnique({ where: { id: body.productoId } })
  if (!producto) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  const item = await prisma.atencionProducto.create({
    data: {
      atencionId: atencion.id,
      productoId: producto.id,
      cantidad,
      precioUnit: producto.precioVenta,
    },
    include,
  })

  return NextResponse.json(item, { status: 201 })
}
