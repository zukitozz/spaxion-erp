import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { atencionActualInclude, mapCabinaConAtencion } from '@/lib/cabinas'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const cabinas = await prisma.cabina.findMany({
    orderBy: { nombre: 'asc' },
    include: atencionActualInclude,
  })

  return NextResponse.json(cabinas.map(mapCabinaConAtencion))
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()

  const cabina = await prisma.cabina.create({
    data: {
      nombre: body.nombre,
      estado: body.estado || 'DISPONIBLE',
    },
  })

  return NextResponse.json(cabina, { status: 201 })
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()

  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  if (body.estado) {
    return NextResponse.json(
      { error: 'Usa PATCH /api/cabinas/[id]/estado para cambiar el estado de una cabina' },
      { status: 400 }
    )
  }

  const updated = await prisma.cabina.update({
    where: { id: body.id },
    data: { nombre: body.nombre },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  await prisma.cabina.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
