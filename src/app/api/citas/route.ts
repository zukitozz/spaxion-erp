import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const citas = await prisma.cita.findMany({
    include: { cliente: true },
    orderBy: { fecha: 'asc' },
  })

  return NextResponse.json(citas)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth()
  if (guard) return guard
  const body = await req.json()
  const cita = await prisma.cita.create({
    data: {
      cliente: { connect: { id: body.clienteId } },
      fecha: new Date(body.fecha),
      tratamiento: body.tratamiento,
      estado: body.estado || 'PENDIENTE',
      registrado: false,
    },
  })

  return NextResponse.json(cita, { status: 201 })
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth()
  if (guard) return guard
  const body = await req.json()

  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const updated = await prisma.cita.update({
    where: { id: body.id },
    data: {
      fecha: new Date(body.fecha),
      tratamiento: body.tratamiento,
      estado: body.estado,
      registrado: body.registrado ?? false,
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

  await prisma.cita.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
