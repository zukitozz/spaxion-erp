import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { enviarComprobante } from '@/lib/mifact'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  if (!body.facturaId) {
    return NextResponse.json({ error: 'facturaId requerido' }, { status: 400 })
  }

  const factura = await prisma.factura.findUnique({
    where: { id: body.facturaId },
    include: { cliente: true, items: { include: { producto: { select: { codigoBarras: true } } } } },
  })
  if (!factura) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }
  if (factura.tipo === 'NOTA_VENTA') {
    return NextResponse.json({ error: 'Una Nota de venta no se envía a SUNAT' }, { status: 400 })
  }
  if (factura.enviado) {
    return NextResponse.json(factura)
  }

  const configuracion = await prisma.configuracion.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })

  try {
    const resultado = await enviarComprobante(factura, configuracion)

    const actualizada = await prisma.factura.update({
      where: { id: factura.id },
      data: {
        enviado: resultado.exito,
        url: resultado.url || null,
        codigoHash: resultado.codigoHash || null,
        cadenaParaCodigoQr: resultado.cadenaParaCodigoQr || null,
        pdfBytes: resultado.pdfBytes,
        errors: resultado.errors || null,
        xmlEnvio: JSON.stringify(resultado.raw),
      },
      include: { cliente: true, items: true, descuento: true },
    })

    if (!resultado.exito) {
      return NextResponse.json({ error: resultado.errors, factura: actualizada }, { status: 502 })
    }

    return NextResponse.json(actualizada)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar a SUNAT'
    return NextResponse.json({ error: mensaje }, { status: 400 })
  }
}
