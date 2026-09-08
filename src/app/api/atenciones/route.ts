import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { cambiarEstadoCabina } from '@/lib/cabinas'

export const dynamic = 'force-dynamic'

const include = {
  atencion: {
    select: {
      id: true,
      cabina: { select: { id: true, nombre: true } },
      cliente: { select: { id: true, nombre: true } },
      cita: { select: { id: true, fecha: true } },
      fotos: { orderBy: { creadoAt: 'asc' as const } },
    },
  },
  tratamiento: { select: { id: true, nombre: true, duracionMin: true, precio: true } },
  esteticista: { select: { id: true, name: true } },
} satisfies Prisma.AtencionTratamientoInclude

type LineaConAtencion = Prisma.AtencionTratamientoGetPayload<{ include: typeof include }>

function aplanar(linea: LineaConAtencion) {
  const { atencion, ...resto } = linea
  // resto.id (línea de tratamiento) debe prevalecer sobre atencion.id (la visita).
  return { ...atencion, ...resto, atencionId: atencion.id }
}

const PAGE_SIZE_DEFAULT = 15
const PAGE_SIZE_MAX = 100

export async function GET(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const url = new URL(req.url)
  const clienteId = url.searchParams.get('clienteId')
  const tratamientoId = url.searchParams.get('tratamientoId')
  const cabinaId = url.searchParams.get('cabinaId')
  const esteticistaId = url.searchParams.get('esteticistaId')
  const estado = url.searchParams.get('estado')
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(url.searchParams.get('pageSize')) || PAGE_SIZE_DEFAULT))

  const where = {
    ...(tratamientoId ? { tratamientoId } : {}),
    ...(esteticistaId ? { esteticistaId } : {}),
    ...(estado ? { estado: estado as 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA' } : {}),
    ...(desde || hasta
      ? {
          horaInicio: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta) } : {}),
          },
        }
      : {}),
    ...(clienteId || cabinaId
      ? {
          atencion: {
            ...(clienteId ? { clienteId } : {}),
            ...(cabinaId ? { cabinaId } : {}),
          },
        }
      : {}),
  }

  const [atenciones, total] = await Promise.all([
    prisma.atencionTratamiento.findMany({
      where,
      include,
      orderBy: { horaInicio: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.atencionTratamiento.count({ where }),
  ])

  return NextResponse.json({ items: atenciones.map(aplanar), total, page, pageSize })
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'ESTETICISTA'])
  if (guard) return guard

  const body = await req.json()
  if (!body.clienteId || !body.tratamientoId || !body.esteticistaId) {
    return NextResponse.json(
      { error: 'clienteId, tratamientoId y esteticistaId son requeridos' },
      { status: 400 }
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const esteticista = await prisma.user.findUnique({ where: { id: body.esteticistaId } })
  if (esteticista?.role !== 'ESTETICISTA') {
    return NextResponse.json({ error: 'El usuario seleccionado no es un esteticista' }, { status: 400 })
  }

  try {
    const atencion = await prisma.$transaction(async (tx) => {
      if (body.cabinaId) {
        const cabina = await tx.cabina.findUnique({ where: { id: body.cabinaId } })
        if (!cabina) throw new Error('CABINA_NO_ENCONTRADA')
        if (cabina.estado !== 'DISPONIBLE') throw new Error('CABINA_NO_DISPONIBLE')
      }

      if (body.citaId) {
        const cita = await tx.cita.findUnique({ where: { id: body.citaId } })
        if (!cita || cita.registrado || !['PENDIENTE', 'CONFIRMADA'].includes(cita.estado)) {
          throw new Error('CITA_NO_DISPONIBLE')
        }
        const configuracion = await tx.configuracion.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
        const limiteExpiracion = new Date(cita.fecha.getTime() + configuracion.horasExpiracionCita * 60 * 60 * 1000)
        if (limiteExpiracion <= new Date()) {
          await tx.cita.update({ where: { id: cita.id }, data: { estado: 'EXPIRADA' } })
          throw new Error('CITA_EXPIRADA')
        }
      }

      const nueva = await tx.atencion.create({
        data: {
          clienteId: body.clienteId,
          cabinaId: body.cabinaId || null,
          citaId: body.citaId || null,
          notas: body.notas || null,
          tratamientos: {
            create: {
              tratamientoId: body.tratamientoId,
              esteticistaId: body.esteticistaId,
              orden: 0,
            },
          },
        },
        include: {
          cliente: { select: { id: true, nombre: true } },
          cabina: { select: { id: true, nombre: true } },
          tratamientos: {
            include: {
              tratamiento: { select: { id: true, nombre: true, diasProximoTratamiento: true } },
              esteticista: { select: { id: true, name: true } },
            },
          },
        },
      })

      if (body.cabinaId) {
        await cambiarEstadoCabina(tx, {
          cabinaId: body.cabinaId,
          estadoNuevo: 'ATENCION',
          usuarioId: session.user.id,
          atencionId: nueva.id,
        })
      }

      return nueva
    })

    return NextResponse.json(atencion, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'CABINA_NO_DISPONIBLE') {
      return NextResponse.json({ error: 'La cabina no está disponible' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'CABINA_NO_ENCONTRADA') {
      return NextResponse.json({ error: 'Cabina no encontrada' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'CITA_EXPIRADA') {
      return NextResponse.json({ error: 'La cita ha expirado y ya no puede registrarse' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'CITA_NO_DISPONIBLE') {
      return NextResponse.json({ error: 'La cita ya no está disponible' }, { status: 409 })
    }
    throw error
  }
}
