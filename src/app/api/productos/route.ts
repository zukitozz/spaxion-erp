import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { presignarProducto, presignarProductos } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const productos = await prisma.producto.findMany({
    orderBy: { creadoAt: 'desc' },
  })
  return NextResponse.json(await presignarProductos(productos))
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()
  if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
    return NextResponse.json({ error: 'El nombre del producto es requerido' }, { status: 400 })
  }

  try {
    const producto = await prisma.producto.create({
      data: {
        nombre: body.nombre.trim(),
        descripcion: body.descripcion || '',
        precioVenta: Number(body.precioVenta) || 0,
        precioCosto: Number(body.precioCosto) || 0,
        stock: Number(body.stock) || 0,
        alertaStock: Number(body.alertaStock) || 5,
        codigoBarras: body.codigoBarras || null,
      },
    })

    return NextResponse.json(producto, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ese código de barras ya está asignado a otro producto' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo guardar el producto en la base de datos' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()

  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const updated = await prisma.producto.update({
      where: { id: body.id },
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion || '',
        precioVenta: Number(body.precioVenta) || 0,
        precioCosto: Number(body.precioCosto) || 0,
        stock: Number(body.stock) || 0,
        alertaStock: Number(body.alertaStock) || 5,
        codigoBarras: body.codigoBarras || null,
      },
    })

    return NextResponse.json(await presignarProducto(updated))
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ese código de barras ya está asignado a otro producto' }, { status: 409 })
    }
    throw error
  }
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  await prisma.producto.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
