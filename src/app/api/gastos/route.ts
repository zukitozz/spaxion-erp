import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { mediodiaPeru } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const gastos = await prisma.gasto.findMany({
    where: { activo: true },
    orderBy: { fecha: 'desc' },
  })
  return NextResponse.json(gastos)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()
  if (typeof body.concepto !== 'string' || !body.concepto.trim()) {
    return NextResponse.json({ error: 'El concepto del gasto es requerido' }, { status: 400 })
  }
  if (!body.fecha) {
    return NextResponse.json({ error: 'La fecha del gasto es requerida' }, { status: 400 })
  }

  const session = await auth()

  const gasto = await prisma.gasto.create({
    data: {
      concepto: body.concepto.trim(),
      categoria: body.categoria || null,
      monto: Number(body.monto) || 0,
      fecha: mediodiaPeru(body.fecha),
      proveedor: body.proveedor || null,
      numeroComprobante: body.numeroComprobante || null,
      notas: body.notas || null,
      usuarioId: session?.user?.id || null,
    },
  })

  return NextResponse.json(gasto, { status: 201 })
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const body = await req.json()

  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const gasto = await prisma.gasto.update({
    where: { id: body.id },
    data: {
      concepto: body.concepto,
      categoria: body.categoria || null,
      monto: Number(body.monto) || 0,
      fecha: mediodiaPeru(body.fecha),
      proveedor: body.proveedor || null,
      numeroComprobante: body.numeroComprobante || null,
      notas: body.notas || null,
    },
  })

  return NextResponse.json(gasto)
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  await prisma.gasto.update({ where: { id }, data: { activo: false } })

  return NextResponse.json({ success: true })
}
