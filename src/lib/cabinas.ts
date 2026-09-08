import { Prisma, CabinaEstado } from '@prisma/client'

type TxClient = Prisma.TransactionClient

export async function cambiarEstadoCabina(
  tx: TxClient,
  params: {
    cabinaId: string
    estadoNuevo: CabinaEstado
    usuarioId: string
    atencionId?: string | null
    motivo?: string | null
  }
) {
  const cabina = await tx.cabina.findUnique({ where: { id: params.cabinaId } })
  if (!cabina) {
    throw new Error('Cabina no encontrada')
  }

  const actualizada = await tx.cabina.update({
    where: { id: params.cabinaId },
    data: { estado: params.estadoNuevo },
  })

  await tx.cabinaEstadoLog.create({
    data: {
      cabinaId: params.cabinaId,
      estadoAnterior: cabina.estado,
      estadoNuevo: params.estadoNuevo,
      usuarioId: params.usuarioId,
      atencionId: params.atencionId ?? null,
      motivo: params.motivo ?? null,
    },
  })

  return actualizada
}

export const atencionActualInclude = {
  atenciones: {
    where: { tratamientos: { some: { estado: { in: ['PENDIENTE', 'EN_CURSO'] } } } },
    include: {
      cliente: { select: { id: true, nombre: true } },
      tratamientos: {
        orderBy: { orden: 'asc' as const },
        include: {
          tratamiento: { select: { id: true, nombre: true, diasProximoTratamiento: true } },
          esteticista: { select: { id: true, name: true } },
        },
      },
    },
    take: 1,
  },
} satisfies Prisma.CabinaInclude

type CabinaConAtenciones = Prisma.CabinaGetPayload<{ include: typeof atencionActualInclude }>

export function mapCabinaConAtencion(cabina: CabinaConAtenciones) {
  const { atenciones, ...resto } = cabina
  return { ...resto, atencionActual: atenciones[0] ?? null }
}
