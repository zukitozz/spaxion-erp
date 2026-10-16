import { prisma } from '@/lib/prisma'
import { enviarComprobante, obtenerCdr } from '@/lib/facturador'

export async function enviarFacturaASunat(facturaId: string) {
  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: { cliente: true, items: true },
  })
  if (!factura || factura.tipo === 'NOTA_VENTA' || factura.enviado) return null

  try {
    const resultado = await enviarComprobante(factura)
    // El CDR puede no venir en el POST (SUNAT aún no responde): se reintenta luego en sincronizarCdrPendientes.
    const cdr = resultado.cdr ?? (resultado.exito && factura.tipoComprobante !== '03' ? await obtenerCdr(factura.tipoComprobante!, factura.numeracionComprobante!).catch(() => null) : null)
    return prisma.factura.update({
      where: { id: factura.id },
      data: {
        enviado: resultado.exito,
        url: null,
        codigoHash: resultado.hash || null,
        cadenaParaCodigoQr: resultado.qr || null,
        pdfBytes: null,
        errors: resultado.errors || null,
        // Guardar sin reformatear: si se altera un espacio, la firma deja de validar.
        xmlEnvio: resultado.xml,
        cdr,
      },
      include: { cliente: true, items: true },
    })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar a SUNAT'
    return prisma.factura.update({
      where: { id: factura.id },
      data: { errors: mensaje },
      include: { cliente: true, items: true },
    })
  }
}

const DIAS_CDR_DISPONIBLE = 7

/** Descarga el CDR de facturas/notas enviadas que aún no lo tienen, dentro del plazo de 7 días del facturador. */
export async function sincronizarCdrPendientes() {
  const desde = new Date(Date.now() - DIAS_CDR_DISPONIBLE * 24 * 60 * 60 * 1000)
  const pendientes = await prisma.factura.findMany({
    where: { enviado: true, cdr: null, tipoComprobante: { in: ['01', '07', '08'] }, numeracionComprobante: { not: null }, creadoAt: { gte: desde } },
    select: { id: true, tipoComprobante: true, numeracionComprobante: true },
  })
  let guardados = 0
  for (const f of pendientes) {
    const cdr = await obtenerCdr(f.tipoComprobante!, f.numeracionComprobante!).catch(() => null)
    if (!cdr) continue
    await prisma.factura.update({ where: { id: f.id }, data: { cdr } })
    guardados++
  }
  return { pendientes: pendientes.length, guardados }
}
