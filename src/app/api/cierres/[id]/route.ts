import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// Detalle de un cierre de turno: cada comprobante cobrado con sus ítems y las atenciones
// (tratamientos con esteticista y horario, y productos) que se facturaron en él.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const facturas = await prisma.factura.findMany({
    where: { cierreTurnoId: params.id, activo: true },
    select: {
      id: true,
      tipo: true,
      numeracionComprobante: true,
      metodoPago: true,
      total: true,
      creadoAt: true,
      pagoEfectivo: true,
      pagoTarjeta: true,
      pagoYape: true,
      pagoTransferencia: true,
      pagoDeposito: true,
      cliente: { select: { id: true, nombre: true } },
      items: { select: { id: true, nombre: true, cantidad: true, precioUnit: true, total: true } },
      atencionTratamientos: {
        select: {
          id: true,
          horaInicio: true,
          horaFin: true,
          precio: true,
          tratamiento: { select: { nombre: true } },
          esteticista: { select: { name: true } },
          atencion: { select: { cabina: { select: { nombre: true } } } },
        },
      },
    },
    orderBy: { creadoAt: 'asc' },
  })

  const gastos = await prisma.gasto.findMany({
    where: { cierreTurnoId: params.id, activo: true },
    select: { id: true, concepto: true, monto: true, esteticista: { select: { name: true } } },
    orderBy: { creadoAt: 'asc' },
  })

  return NextResponse.json({ facturas, gastos })
}
