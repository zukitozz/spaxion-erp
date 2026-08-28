import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { listarEventos, matchCliente } from '@/lib/googleCalendar'

export const dynamic = 'force-dynamic'

export async function POST() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const configuracion = await prisma.configuracion.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
  if (!configuracion.googleCalendarActivo || !configuracion.googleRefreshTokenEnc) {
    return NextResponse.json({ skipped: true })
  }

  const { events, nextSyncToken } = await listarEventos(configuracion.googleSyncToken)

  for (const evento of events) {
    if (evento.status === 'cancelled') {
      await prisma.cita.deleteMany({ where: { googleEventId: evento.id } })
      continue
    }

    const fechaInicio = evento.start?.dateTime || evento.start?.date
    if (!fechaInicio) continue

    const descripcion = [evento.summary, evento.description].filter(Boolean).join('\n') || null
    // Solo se intenta resolver el cliente cuando la cita todavía no existe: en una
    // actualización no se debe pisar una asignación manual ya hecha en la app. Si no
    // hay coincidencia, la cita queda sin cliente para que un admin la asigne a mano.
    const existente = await prisma.cita.findUnique({ where: { googleEventId: evento.id }, select: { id: true } })
    const clienteId = existente ? undefined : (await matchCliente(evento))?.id

    // upsert es atómico a nivel de DB (INSERT ... ON CONFLICT): evita el choque de
    // unique constraint si dos syncs corren en paralelo (p.ej. StrictMode en dev).
    await prisma.cita.upsert({
      where: { googleEventId: evento.id },
      update: {
        fecha: new Date(fechaInicio),
        tratamiento: evento.summary || undefined,
        descripcion,
      },
      create: {
        fecha: new Date(fechaInicio),
        tratamiento: evento.summary || 'Cita importada de Google Calendar',
        descripcion,
        estado: 'PENDIENTE',
        origen: 'GOOGLE',
        googleEventId: evento.id,
        clienteId,
      },
    })
  }

  await prisma.configuracion.update({ where: { id: 'default' }, data: { googleSyncToken: nextSyncToken } })

  const citas = await prisma.cita.findMany({ include: { cliente: true }, orderBy: { fecha: 'asc' } })
  return NextResponse.json({ citas })
}
