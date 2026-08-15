import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  if (!body.citaId) return NextResponse.json({ error: 'citaId requerido' }, { status: 400 })

  const token = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'Configura GOOGLE_CALENDAR_ACCESS_TOKEN después del flujo OAuth' }, { status: 501 })

  const settings = await prisma.configuracion.findUnique({ where: { id: 'default' } })
  const cita = await prisma.cita.findUnique({ where: { id: body.citaId }, include: { cliente: true } })
  if (!cita) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

  const start = new Date(cita.fecha)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const calendarId = settings?.googleCalendarId || 'primary'
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: `${cita.tratamiento} · ${cita.cliente.nombre}`,
      description: `Cita registrada en Spaxión ERP. Estado: ${cita.estado}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  })

  const data = await response.json().catch(() => ({}))
  return NextResponse.json(data, { status: response.ok ? 201 : 502 })
}
