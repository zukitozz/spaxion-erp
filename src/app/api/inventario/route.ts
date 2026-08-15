import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const productos = await prisma.producto.findMany({
    orderBy: { creadoAt: 'desc' },
  })

  return NextResponse.json(productos)
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
        stock: body.stock !== undefined ? Number(body.stock) : undefined,
        alertaStock: body.alertaStock !== undefined ? Number(body.alertaStock) : undefined,
        codigoBarras: body.codigoBarras !== undefined ? body.codigoBarras || null : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ese código de barras ya está asignado a otro producto' }, { status: 409 })
    }
    throw error
  }
}
