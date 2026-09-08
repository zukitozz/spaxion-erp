import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const atenciones = await prisma.atencion.findMany({
    where: {
      clienteId: params.id,
      OR: [
        { tratamientos: { some: { estado: 'FINALIZADA', facturaId: null } } },
        { productos: { some: { facturaId: null } } },
      ],
    },
    include: {
      cabina: { select: { id: true, nombre: true } },
      tratamientos: {
        where: { estado: 'FINALIZADA', facturaId: null },
        include: { tratamiento: { select: { id: true, nombre: true, precio: true } } },
        orderBy: { orden: 'asc' },
      },
      productos: {
        where: { facturaId: null },
        include: { producto: { select: { id: true, nombre: true } } },
        orderBy: { creadoAt: 'asc' },
      },
    },
    orderBy: { horaInicio: 'asc' },
  })

  const pendientes = atenciones.map((atencion) => ({
    id: atencion.id,
    horaInicio: atencion.horaInicio,
    cabina: atencion.cabina,
    tratamientos: atencion.tratamientos.map((linea) => ({
      id: linea.id,
      nombre: linea.tratamiento.nombre,
      precio: linea.tratamiento.precio,
    })),
    productos: atencion.productos.map((item) => ({
      id: item.id,
      cantidad: item.cantidad,
      precioUnit: item.precioUnit,
      producto: item.producto,
    })),
  }))

  return NextResponse.json(pendientes)
}
