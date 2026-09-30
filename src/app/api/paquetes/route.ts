import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireApiAuth } from '@/lib/api-auth'
import { calcularSaldo } from '@/lib/paquetes'

export const dynamic = 'force-dynamic'

const abonosActivosInclude = {
  facturas: { where: { tipo: 'NOTA_VENTA' as const, activo: true } },
  cliente: { select: { id: true, nombre: true } },
  tratamiento: { select: { id: true, nombre: true } },
  sesiones: { orderBy: { numero: 'asc' as const } },
}

function conSaldoPendiente(paquete: { precioTotal: number; facturas: { total: number }[] }) {
  const { pagado, saldo } = calcularSaldo(paquete.precioTotal, paquete.facturas)
  return { pagado, saldo }
}

export async function GET(req: Request) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const url = new URL(req.url)
  const soloConSaldo = url.searchParams.get('conSaldo') === 'true'

  const paquetes = await prisma.paquete.findMany({
    where: { activo: true, ...(soloConSaldo ? { estado: 'ABIERTO' } : {}) },
    include: abonosActivosInclude,
    orderBy: { creadoAt: 'desc' },
  })

  const resultado = paquetes
    .map((paquete) => ({ ...paquete, ...conSaldoPendiente(paquete) }))
    .filter((paquete) => !soloConSaldo || paquete.saldo > 0.01)

  return NextResponse.json(resultado)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario autenticado requerido' }, { status: 401 })
  }

  const body = await req.json()
  const clienteId = typeof body.clienteId === 'string' ? body.clienteId : ''
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const sesionesTotal = Number(body.sesionesTotal)
  const precioTotal = Number(body.precioTotal)
  const tratamientoId = typeof body.tratamientoId === 'string' && body.tratamientoId.length > 0 ? body.tratamientoId : null

  if (!clienteId || !nombre) {
    return NextResponse.json({ error: 'Cliente y nombre del paquete son requeridos' }, { status: 400 })
  }
  if (!Number.isInteger(sesionesTotal) || sesionesTotal <= 0) {
    return NextResponse.json({ error: 'sesionesTotal debe ser un entero mayor a 0' }, { status: 400 })
  }
  if (!Number.isFinite(precioTotal) || precioTotal <= 0) {
    return NextResponse.json({ error: 'precioTotal debe ser mayor a 0' }, { status: 400 })
  }

  const paquete = await prisma.paquete.create({
    data: {
      cliente: { connect: { id: clienteId } },
      tratamiento: tratamientoId ? { connect: { id: tratamientoId } } : undefined,
      nombre,
      sesionesTotal,
      precioTotal,
      usuario: { connect: { id: session.user.id } },
    },
    include: abonosActivosInclude,
  })

  return NextResponse.json({ ...paquete, ...conSaldoPendiente(paquete) }, { status: 201 })
}
