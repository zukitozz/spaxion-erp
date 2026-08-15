import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const MS_POR_DIA = 24 * 60 * 60 * 1000

export async function POST(req: Request, { params }: { params: { clienteId: string } }) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR', 'OPERADOR'])
  if (guard) return guard

  const body = await req.json()
  const dias = Number(body.dias)
  if (!Number.isFinite(dias) || dias <= 0) {
    return NextResponse.json({ error: 'dias debe ser un número mayor a 0' }, { status: 400 })
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.clienteId },
    select: {
      recordatorioPospuestoHasta: true,
      atenciones: {
        where: { estado: 'FINALIZADA', horaFin: { not: null } },
        orderBy: { horaFin: 'desc' },
        take: 1,
        select: { horaFin: true, diasProximoTratamiento: true, tratamiento: { select: { diasProximoTratamiento: true } } },
      },
    },
  })

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }

  const ultima = cliente.atenciones[0]
  const diasSugeridos = ultima ? ultima.diasProximoTratamiento ?? ultima.tratamiento.diasProximoTratamiento ?? null : null

  let fechaBase = new Date()
  if (ultima && ultima.horaFin && diasSugeridos) {
    const fechaSugerida = new Date(ultima.horaFin.getTime() + diasSugeridos * MS_POR_DIA)
    if (fechaSugerida > fechaBase) fechaBase = fechaSugerida
  }
  if (cliente.recordatorioPospuestoHasta && cliente.recordatorioPospuestoHasta > fechaBase) {
    fechaBase = cliente.recordatorioPospuestoHasta
  }

  const recordatorioPospuestoHasta = new Date(fechaBase.getTime() + dias * MS_POR_DIA)

  const actualizado = await prisma.cliente.update({
    where: { id: params.clienteId },
    data: { recordatorioPospuestoHasta },
    select: { id: true, recordatorioPospuestoHasta: true },
  })

  return NextResponse.json(actualizado)
}
