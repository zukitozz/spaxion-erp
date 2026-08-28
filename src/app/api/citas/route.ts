import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { actualizarEvento, crearEvento, eliminarEvento } from '@/lib/googleCalendar'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const configuracion = await prisma.configuracion.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
  const limiteExpiracion = new Date(Date.now() - configuracion.horasExpiracionCita * 60 * 60 * 1000)

  await prisma.cita.updateMany({
    where: {
      fecha: { lt: limiteExpiracion },
      estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      registrado: false,
    },
    data: { estado: 'EXPIRADA' },
  })

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

  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)
  if (new Date(body.fecha) < inicioHoy) {
    return NextResponse.json({ error: 'No se pueden crear citas en fechas anteriores a hoy' }, { status: 400 })
  }

  const cita = await prisma.cita.create({
    data: {
      cliente: body.clienteId ? { connect: { id: body.clienteId } } : undefined,
      fecha: new Date(body.fecha),
      tratamiento: body.tratamiento,
      duracionMin: body.duracionMin ? Number(body.duracionMin) : null,
      estado: body.estado || 'PENDIENTE',
      registrado: false,
    },
    include: { cliente: true },
  })

  const googleEventId = await crearEvento(cita)
  if (googleEventId) {
    await prisma.cita.update({ where: { id: cita.id }, data: { googleEventId } })
    cita.googleEventId = googleEventId
  }

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
      cliente: body.clienteId ? { connect: { id: body.clienteId } } : body.clienteId === null ? { disconnect: true } : undefined,
      fecha: body.fecha ? new Date(body.fecha) : undefined,
      tratamiento: body.tratamiento,
      duracionMin: body.duracionMin !== undefined ? (body.duracionMin ? Number(body.duracionMin) : null) : undefined,
      estado: body.estado,
      registrado: body.registrado ?? undefined,
    },
    include: { cliente: true },
  })

  if (updated.googleEventId) {
    await actualizarEvento(updated)
  } else {
    const googleEventId = await crearEvento(updated)
    if (googleEventId) {
      await prisma.cita.update({ where: { id: updated.id }, data: { googleEventId } })
      updated.googleEventId = googleEventId
    }
  }

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

  const cita = await prisma.cita.delete({ where: { id } })
  if (cita.googleEventId) await eliminarEvento(cita.googleEventId)

  return NextResponse.json({ success: true })
}
