import type { Prisma, PrismaClient } from '@prisma/client'

type ClientLike = PrismaClient | Prisma.TransactionClient

export const facturaPendienteInclude = {
  cliente: { select: { id: true, nombre: true } },
} satisfies Prisma.FacturaInclude

// cuentaParaCierre:false excluye el comprobante final que consolida un paquete de pagos
// parciales (ver src/lib/paquetes.ts): el dinero se cuenta con cada abono. Pero al emitir ese
// comprobante los abonos pasan a activo:false (absorbidos), así que los abonos absorbidos que aún
// no entraron en ningún cierre también deben contarse; si no, el dinero cobrado en el mismo turno
// en que se emite el comprobante final quedaría fuera. Los abonos eliminados (activo:false sin
// comprobanteFinalId) siguen excluidos.
export const criterioCuentaParaCierre = {
  OR: [
    { activo: true, cuentaParaCierre: true },
    { activo: false, tipo: 'NOTA_VENTA', comprobanteFinalId: { not: null } },
  ],
} satisfies Prisma.FacturaWhereInput

export function obtenerFacturasPendientes(client: ClientLike) {
  return client.factura.findMany({
    where: { estado: 'PAGADO', cierreTurnoId: null, ...criterioCuentaParaCierre },
    include: facturaPendienteInclude,
    orderBy: { creadoAt: 'asc' },
  })
}

export const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'DEPOSITO'] as const

interface FacturaConPagos {
  total: number
  metodoPago: string
  pagoEfectivo?: number | null
  pagoTarjeta?: number | null
  pagoYape?: number | null
  pagoTransferencia?: number | null
  pagoDeposito?: number | null
}

// Suma por las columnas pago* (no por factura.metodoPago) para que una factura MIXTO reparta su
// monto entre los métodos reales con los que se cobró, en vez de quedar fuera de todos los buckets.
export function calcularTotales(facturas: FacturaConPagos[]) {
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
    totalesPorMetodo.EFECTIVO += factura.pagoEfectivo || 0
    totalesPorMetodo.TARJETA += factura.pagoTarjeta || 0
    totalesPorMetodo.YAPE += factura.pagoYape || 0
    totalesPorMetodo.TRANSFERENCIA += factura.pagoTransferencia || 0
    totalesPorMetodo.DEPOSITO += factura.pagoDeposito || 0
  }
  return { total, totalesPorMetodo }
}
