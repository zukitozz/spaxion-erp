import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const descuentos = await prisma.descuento.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(descuentos)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()

  const descuento = await prisma.descuento.create({
    data: {
      codigo: body.codigo,
      descripcion: body.descripcion || null,
      tipo: body.tipo || 'PORCENTAJE',
      valor: Number(body.valor) || 0,
      activo: body.activo ?? true,
      fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
      fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
    },
  })

  return NextResponse.json(descuento, { status: 201 })
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()

  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const updated = await prisma.descuento.update({
    where: { id: body.id },
    data: {
      descripcion: body.descripcion ?? undefined,
      tipo: body.tipo ?? undefined,
      valor: body.valor !== undefined ? Number(body.valor) : undefined,
      activo: body.activo !== undefined ? body.activo : undefined,
      fechaInicio: body.fechaInicio !== undefined ? (body.fechaInicio ? new Date(body.fechaInicio) : null) : undefined,
      fechaFin: body.fechaFin !== undefined ? (body.fechaFin ? new Date(body.fechaFin) : null) : undefined,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  await prisma.descuento.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
