import type { Prisma, PrismaClient } from '@prisma/client'

type ClientLike = PrismaClient | Prisma.TransactionClient

export const facturaPendienteInclude = {
  cliente: { select: { id: true, nombre: true } },
} satisfies Prisma.FacturaInclude

export function obtenerFacturasPendientes(client: ClientLike) {
  return client.factura.findMany({
    where: { estado: 'PAGADO', cierreTurnoId: null },
    include: facturaPendienteInclude,
    orderBy: { creadoAt: 'asc' },
  })
}

export const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'DEPOSITO'] as const

export function calcularTotales(facturas: { total: number; metodoPago: string }[]) {
  const totalesPorMetodo: Record<(typeof METODOS_PAGO)[number], number> = {
    EFECTIVO: 0,
    TARJETA: 0,
    YAPE: 0,
    PLIN: 0,
    TRANSFERENCIA: 0,
    DEPOSITO: 0,
  }
  let total = 0
  for (const factura of facturas) {
    total += factura.total
    if (factura.metodoPago in totalesPorMetodo) {
      totalesPorMetodo[factura.metodoPago as (typeof METODOS_PAGO)[number]] += factura.total
    }
  }
  return { total, totalesPorMetodo }
}
