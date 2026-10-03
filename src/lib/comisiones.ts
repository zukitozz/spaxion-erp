import type { Prisma, PrismaClient } from '@prisma/client'
import { hoyPeru, mediodiaPeru } from '@/lib/fechas'

type ClientLike = PrismaClient | Prisma.TransactionClient

export const CATEGORIA_COMISIONES = 'Comisiones'

export function parseComision(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

/**
 * La comisión se paga a la esteticista en el momento, así que se registra como Gasto
 * (sin cierre asignado). El próximo cierre de turno lo toma y lo suma a sus gastos.
 */
export function registrarGastoComision(
  client: ClientLike,
  datos: { monto: number; esteticistaId: string; concepto: string; usuarioId?: string | null }
) {
  return client.gasto.create({
    data: {
      concepto: datos.concepto,
      categoria: CATEGORIA_COMISIONES,
      monto: datos.monto,
      fecha: mediodiaPeru(hoyPeru()),
      esteticistaId: datos.esteticistaId,
      usuarioId: datos.usuarioId ?? null,
    },
  })
}

export function obtenerGastosPendientes(client: ClientLike) {
  return client.gasto.findMany({
    where: { activo: true, cierreTurnoId: null, categoria: CATEGORIA_COMISIONES },
    include: { esteticista: { select: { id: true, name: true } } },
    orderBy: { creadoAt: 'asc' },
  })
}
