import { prisma } from '@/lib/prisma'
import { enviarComprobante } from '@/lib/mifact'

export async function enviarFacturaASunat(facturaId: string) {
  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: { cliente: true, items: { include: { producto: { select: { codigoBarras: true } } } } },
  })
  if (!factura || factura.tipo === 'NOTA_VENTA' || factura.enviado) return null

  const configuracion = await prisma.configuracion.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })

  try {
    const resultado = await enviarComprobante(factura, configuracion)
    return prisma.factura.update({
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
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar a SUNAT'
    return prisma.factura.update({
      where: { id: factura.id },
      data: { errors: mensaje },
      include: { cliente: true, items: true, descuento: true },
    })
  }
}
