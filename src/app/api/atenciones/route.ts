import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { cambiarEstadoCabina } from '@/lib/cabinas'

export const dynamic = 'force-dynamic'

const include = {
  cabina: { select: { id: true, nombre: true } },
  cliente: { select: { id: true, nombre: true } },
  tratamiento: { select: { id: true, nombre: true, duracionMin: true, precio: true } },
  esteticista: { select: { id: true, name: true } },
  cita: { select: { id: true, fecha: true } },
  fotos: { orderBy: { creadoAt: 'asc' as const } },
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
    ...(clienteId ? { clienteId } : {}),
    ...(tratamientoId ? { tratamientoId } : {}),
    ...(cabinaId ? { cabinaId } : {}),
    ...(esteticistaId ? { esteticistaId } : {}),
    ...(estado ? { estado: estado as 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA' } : {}),
    ...(desde || hasta
      ? {
          horaInicio: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta) } : {}),
          },
        }
      : {}),
  }

  const [atenciones, total] = await Promise.all([
    prisma.atencionCabina.findMany({
      where,
      include,
      orderBy: { horaInicio: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.atencionCabina.count({ where }),
  ])

  return NextResponse.json({ items: atenciones, total, page, pageSize })
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'OPERADOR', 'ESTETICISTA'])
  if (guard) return guard

  const body = await req.json()
  if (!body.cabinaId || !body.clienteId || !body.tratamientoId || !body.esteticistaId) {
    return NextResponse.json(
      { error: 'cabinaId, clienteId, tratamientoId y esteticistaId son requeridos' },
      { status: 400 }
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario requerido' }, { status: 401 })
  }

  const esteticista = await prisma.user.findUnique({ where: { id: body.esteticistaId } })
  if (!esteticista || esteticista.role !== 'ESTETICISTA') {
    return NextResponse.json({ error: 'El usuario seleccionado no es un esteticista' }, { status: 400 })
  }

  try {
    const atencion = await prisma.$transaction(async (tx) => {
      const cabina = await tx.cabina.findUnique({ where: { id: body.cabinaId } })
      if (!cabina) throw new Error('CABINA_NO_ENCONTRADA')
      if (cabina.estado !== 'DISPONIBLE') throw new Error('CABINA_NO_DISPONIBLE')

      const nueva = await tx.atencionCabina.create({
        data: {
          cabinaId: body.cabinaId,
          clienteId: body.clienteId,
          tratamientoId: body.tratamientoId,
          esteticistaId: body.esteticistaId,
          citaId: body.citaId || null,
          notas: body.notas || null,
        },
        include,
      })

      await cambiarEstadoCabina(tx, {
        cabinaId: body.cabinaId,
        estadoNuevo: 'ATENCION',
        usuarioId: session.user.id,
        atencionId: nueva.id,
      })

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
    throw error
  }
}
