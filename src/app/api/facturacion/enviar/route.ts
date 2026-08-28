import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { enviarFacturaASunat } from '@/lib/enviarFactura'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  if (!body.facturaId) {
    return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })
  }

  const existente = await prisma.factura.findUnique({ where: { id: body.facturaId } })
  if (!existente) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }
  if (existente.tipo === 'NOTA_VENTA') {
    return NextResponse.json({ error: 'Una Nota de venta no se envía a SUNAT' }, { status: 400 })
  }
  if (existente.enviado) {
    return NextResponse.json(existente)
  }

  try {
    const actualizada = await enviarFacturaASunat(body.facturaId)
    if (!actualizada) {
      return NextResponse.json({ error: 'No se pudo enviar el comprobante a SUNAT' }, { status: 400 })
    }
    if (!actualizada.enviado) {
      return NextResponse.json({ error: actualizada.errors, factura: actualizada }, { status: 502 })
    }
    return NextResponse.json(actualizada)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar a SUNAT'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }
}
