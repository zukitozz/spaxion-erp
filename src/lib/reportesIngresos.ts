import type { Prisma, PrismaClient } from '@prisma/client'
import { calcularTotales } from '@/lib/cierres'

type ClientLike = PrismaClient | Prisma.TransactionClient

// Mismo criterio que obtenerFacturasPendientes (src/lib/cierres.ts): cuentaParaCierre:false
// excluye el comprobante final que consolida un paquete de pagos parciales, para no duplicar ese
// dinero (ya se contabilizó al cobrar cada abono).
export async function obtenerIngresosDelPeriodo(client: ClientLike, rango: { gte: Date; lte: Date }) {
  const facturas = await client.factura.findMany({
    where: { activo: true, estado: 'PAGADO', cuentaParaCierre: true, fechaEmision: rango },
    select: {
      total: true,
      metodoPago: true,
      pagoEfectivo: true,
      pagoTarjeta: true,
      pagoYape: true,
      pagoTransferencia: true,
      pagoDeposito: true,
    },
  })
  return calcularTotales(facturas)
}
