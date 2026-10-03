import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { mediodiaPeru } from '@/lib/fechas'
import { CATEGORIA_COMPRAS } from '@/lib/compras'
import type { UserRole } from '@/types/user'

export const dynamic = 'force-dynamic'

const ROLES: UserRole[] = ['SUPERVISOR']

// Solo opera sobre gastos de categoría "Compras": el Administrador no debe poder ver ni tocar
// el resto de los gastos, que son exclusivos del Gerente.
async function esCompra(id: string) {
  const gasto = await prisma.gasto.findUnique({ where: { id }, select: { categoria: true, activo: true } })
  return !!gasto && gasto.activo && gasto.categoria === CATEGORIA_COMPRAS
}

export async function GET() {
  const guard = await requireApiAuth(ROLES)
  if (guard) return guard
  const compras = await prisma.gasto.findMany({
    where: { activo: true, categoria: CATEGORIA_COMPRAS },
    orderBy: { fecha: 'desc' },
  })
  return NextResponse.json(compras)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(ROLES)
  if (guard) return guard
  const body = await req.json()
  if (typeof body.concepto !== 'string' || !body.concepto.trim()) {
    return NextResponse.json({ error: 'El concepto de la compra es requerido' }, { status: 400 })
  }
  if (!body.fecha) {
    return NextResponse.json({ error: 'La fecha de la compra es requerida' }, { status: 400 })
  }

  const session = await auth()
  const compra = await prisma.gasto.create({
    data: {
      concepto: body.concepto.trim(),
      categoria: CATEGORIA_COMPRAS,
      monto: Number(body.monto) || 0,
      fecha: mediodiaPeru(body.fecha),
      proveedor: body.proveedor || null,
      numeroComprobante: body.numeroComprobante || null,
      notas: body.notas || null,
      usuarioId: session?.user?.id || null,
    },
  })
  return NextResponse.json(compra, { status: 201 })
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth(ROLES)
  if (guard) return guard
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  if (!(await esCompra(body.id))) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })

  const compra = await prisma.gasto.update({
    where: { id: body.id },
    data: {
      concepto: body.concepto,
      monto: Number(body.monto) || 0,
      fecha: mediodiaPeru(body.fecha),
      proveedor: body.proveedor || null,
      numeroComprobante: body.numeroComprobante || null,
      notas: body.notas || null,
    },
  })
  return NextResponse.json(compra)
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(ROLES)
  if (guard) return guard
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  if (!(await esCompra(id))) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 })

  await prisma.gasto.update({ where: { id }, data: { activo: false } })
  return NextResponse.json({ success: true })
}
