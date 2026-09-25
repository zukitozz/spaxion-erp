import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const include = {
  tratamiento: { select: { id: true, nombre: true, diasProximoTratamiento: true } },
  esteticista: { select: { id: true, name: true } },
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'ESTETICISTA'])
  if (guard) return guard

  const body = await req.json()
  if (typeof body.tratamientoId !== 'string' || typeof body.esteticistaId !== 'string') {
    return NextResponse.json({ error: 'tratamientoId y esteticistaId son requeridos' }, { status: 400 })
  }

  const atencion = await prisma.atencion.findUnique({
    where: { id: params.id },
    include: { tratamientos: { select: { estado: true, orden: true } } },
  })
  if (!atencion) {
    return NextResponse.json({ error: 'Atención no encontrada' }, { status: 404 })
  }
  const abierta = atencion.tratamientos.length === 0 || atencion.tratamientos.some((t) => t.estado === 'PENDIENTE' || t.estado === 'EN_CURSO')
  if (!abierta) {
    return NextResponse.json({ error: 'Esta atención ya está cerrada' }, { status: 409 })
  }

  const esteticista = await prisma.user.findUnique({ where: { id: body.esteticistaId } })
  if (esteticista?.role !== 'ESTETICISTA') {
    return NextResponse.json({ error: 'El usuario seleccionado no es un esteticista' }, { status: 400 })
  }

  const tratamiento = await prisma.tratamiento.findUnique({ where: { id: body.tratamientoId } })
  if (!tratamiento) {
    return NextResponse.json({ error: 'Tratamiento no encontrado' }, { status: 404 })
  }

  // Solo ADMIN/SUPERVISOR pueden acordar un precio distinto al del catálogo; la esteticista
  // siempre asigna el tratamiento al precio de catálogo.
  const session = await auth()
  const puedeCambiarPrecio = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERVISOR'
  const precioBody = Number(body.precio)
  const precio = puedeCambiarPrecio && Number.isFinite(precioBody) && precioBody >= 0 ? precioBody : tratamiento.precio

  const orden = atencion.tratamientos.reduce((max, t) => Math.max(max, t.orden), -1) + 1

  const linea = await prisma.atencionTratamiento.create({
    data: {
      atencionId: atencion.id,
      tratamientoId: body.tratamientoId,
      esteticistaId: body.esteticistaId,
      orden,
      precio,
      precioCatalogo: tratamiento.precio,
    },
    include,
  })

  return NextResponse.json(linea, { status: 201 })
}
