import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cambiarEstadoCabina } from '@/lib/cabinas'

type TxClient = Prisma.TransactionClient

const LINEAS_ABIERTAS = ['PENDIENTE', 'EN_CURSO'] as const

export const atencionEnCursoInclude = {
  cliente: { select: { id: true, nombre: true } },
  cabina: { select: { id: true, nombre: true } },
  cita: { select: { id: true, fecha: true } },
  tratamientos: {
    orderBy: { orden: 'asc' as const },
    include: {
      tratamiento: { select: { id: true, nombre: true, diasProximoTratamiento: true } },
      esteticista: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.AtencionInclude

export type AtencionEnCurso = Prisma.AtencionGetPayload<{ include: typeof atencionEnCursoInclude }>

export async function listarAtencionesEnCurso(role: string, userId: string) {
  const where: Prisma.AtencionWhereInput =
    role === 'ESTETICISTA'
      ? { tratamientos: { some: { estado: { in: [...LINEAS_ABIERTAS] }, esteticistaId: userId } } }
      : { tratamientos: { some: { estado: { in: [...LINEAS_ABIERTAS] } } } }

  return prisma.atencion.findMany({ where, include: atencionEnCursoInclude, orderBy: { horaInicio: 'asc' } })
}

/**
 * Tras iniciar/finalizar/cancelar una línea de tratamiento, revisa si a la
 * atención (visita) no le queda ninguna línea abierta; si es así, la cierra
 * y, si corresponde, libera la cabina asociada.
 */
export async function cerrarSesionSiCorresponde(tx: TxClient, atencionId: string, usuarioId: string) {
  const atencion = await tx.atencion.findUnique({
    where: { id: atencionId },
    include: { tratamientos: { select: { estado: true } } },
  })
  if (!atencion) return

  const quedanAbiertos = atencion.tratamientos.some((t) => (LINEAS_ABIERTAS as readonly string[]).includes(t.estado))
  if (quedanAbiertos) return

  await tx.atencion.update({ where: { id: atencion.id }, data: { horaFin: new Date() } })

  if (!atencion.cabinaId) return
  const configuracion = await tx.configuracion.findUnique({ where: { id: 'default' } })
  if (!configuracion?.usaCabinas) return

  const huboFinalizados = atencion.tratamientos.some((t) => t.estado === 'FINALIZADA')
  await cambiarEstadoCabina(tx, {
    cabinaId: atencion.cabinaId,
    estadoNuevo: huboFinalizados ? 'LIMPIEZA' : 'DISPONIBLE',
    usuarioId,
    atencionId: atencion.id,
  })
}
