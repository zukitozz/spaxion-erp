import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const settings = await prisma.configuracion.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
  const { googleRefreshTokenEnc: _googleRefreshTokenEnc, ...safeSettings } = settings
  return NextResponse.json(safeSettings)
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  const settings = await prisma.configuracion.upsert({
    where: { id: 'default' },
    update: {
      nombreEmpresa: body.nombreEmpresa,
      ruc: body.ruc || null,
      razonSocial: body.razonSocial || null,
      direccionFiscal: body.direccionFiscal || null,
      codigoUbigeo: body.codigoUbigeo || null,
      googleCalendarActivo: Boolean(body.googleCalendarActivo),
      googleCalendarId: body.googleCalendarId || null,
      facturacionEndpoint: body.facturacionEndpoint || null,
      facturacionActivo: Boolean(body.facturacionActivo),
      horasExpiracionCita: Math.max(1, Number(body.horasExpiracionCita) || 24),
      usaCabinas: Boolean(body.usaCabinas),
    },
    create: {
      id: 'default',
      nombreEmpresa: body.nombreEmpresa || 'Spaxión Centro Estético',
      ruc: body.ruc || null,
      razonSocial: body.razonSocial || null,
      direccionFiscal: body.direccionFiscal || null,
      codigoUbigeo: body.codigoUbigeo || null,
      googleCalendarActivo: Boolean(body.googleCalendarActivo),
      googleCalendarId: body.googleCalendarId || null,
      facturacionEndpoint: body.facturacionEndpoint || null,
      facturacionActivo: Boolean(body.facturacionActivo),
      horasExpiracionCita: Math.max(1, Number(body.horasExpiracionCita) || 24),
      usaCabinas: body.usaCabinas === undefined ? true : Boolean(body.usaCabinas),
    },
  })

  const { googleRefreshTokenEnc: _googleRefreshTokenEnc, ...safeSettings } = settings
  return NextResponse.json(safeSettings)
}
