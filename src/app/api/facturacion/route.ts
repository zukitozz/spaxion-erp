import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { obtenerCorrelativo, resolverPrefijo } from '@/lib/correlativos'
import { numeroALetras } from '@/lib/numeroALetras'
import { enviarFacturaASunat } from '@/lib/enviarFactura'

export const dynamic = 'force-dynamic'

function round2(value: number) {
  return Math.round(value * 100) / 100
}

const IGV_PORCENTAJE = Number(process.env.IGV_PORCENTAJE || '18')

const CODIGO_SUNAT_TIPO_COMPROBANTE: Record<string, string | null> = {
  BOLETA: '03',
  FACTURA: '01',
  NOTA_VENTA: null,
}

const TIPO_DOCUMENTO_CORRELATIVO: Record<string, string> = {
  BOLETA: '03',
  FACTURA: '01',
  NOTA_VENTA: '51',
}

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const facturas = await prisma.factura.findMany({
    where: { activo: true },
    include: { cliente: true, items: true, descuento: true },
    orderBy: { creadoAt: 'desc' },
  })

  return NextResponse.json(facturas)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth()
  if (guard) return guard
  const body = await req.json()

  if (!body.clienteId || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Cliente e items requeridos' }, { status: 400 })
  }

  const tratamientoLineIds: string[] = Array.isArray(body.tratamientoLineIds)
    ? body.tratamientoLineIds.filter((id: unknown) => typeof id === 'string')
    : []
  const productoLineIds: string[] = Array.isArray(body.productoLineIds)
    ? body.productoLineIds.filter((id: unknown) => typeof id === 'string')
    : []

  const lineasTratamiento = tratamientoLineIds.length > 0
    ? await prisma.atencionTratamiento.findMany({
        where: { id: { in: tratamientoLineIds }, atencion: { clienteId: body.clienteId }, estado: 'FINALIZADA', facturaId: null },
        include: { tratamiento: { select: { nombre: true, precio: true } } },
      })
    : []

  const lineasProducto = productoLineIds.length > 0
    ? await prisma.atencionProducto.findMany({
        where: { id: { in: productoLineIds }, atencion: { clienteId: body.clienteId }, facturaId: null },
        include: { producto: { select: { nombre: true } } },
      })
    : []

  const itemsDeAtenciones = [
    ...lineasTratamiento.map((linea) => ({
      productoId: null as string | null,
      nombre: linea.tratamiento.nombre,
      cantidad: 1,
      precioUnit: linea.tratamiento.precio,
      total: round2(linea.tratamiento.precio),
    })),
    ...lineasProducto.map((item) => ({
      productoId: item.productoId as string | null,
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precioUnit: item.precioUnit,
      total: round2(item.cantidad * item.precioUnit),
    })),
  ]

  // Los items manuales admiten un producto o un tratamiento (sin control de stock en este último caso).
  const itemsManuales = body.items
    .filter((item: any) =>
      (typeof item.productoId === 'string' && item.productoId.length > 0) ||
      (typeof item.tratamientoId === 'string' && item.tratamientoId.length > 0)
    )
    .map((item: any) => ({
      productoId: typeof item.productoId === 'string' && item.productoId.length > 0 ? item.productoId : null,
      nombre: item.nombre,
      cantidad: Number(item.cantidad) || 0,
      precioUnit: Number(item.precioUnit) || 0,
      total: round2((Number(item.cantidad) || 0) * (Number(item.precioUnit) || 0)),
    }))

  const items = [...itemsDeAtenciones, ...itemsManuales]

  if (items.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un producto o tratamiento pendiente' }, { status: 400 })
  }

  const subtotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0)
  const descuentoAplicado = Math.min(round2(Math.max(0, Number(body.montoDescuento) || 0)), subtotal)
  const total = round2(subtotal - descuentoAplicado)

  // SUNAT valida que la suma de los items coincida con el total del comprobante, así que en
  // vez de declarar un descuento aparte, se recalcula hacia atrás el precio de cada item para
  // que ya reflejen el precio final acordado con el cliente.
  const itemsFacturados = descuentoAplicado > 0 && subtotal > 0
    ? (() => {
        const factor = total / subtotal
        let acumulado = 0
        return items.map((item: { total: number; cantidad: number }, index: number) => {
          const esUltimo = index === items.length - 1
          const nuevoTotal = esUltimo ? round2(total - acumulado) : round2(item.total * factor)
          acumulado = round2(acumulado + nuevoTotal)
          return {
            ...item,
            total: nuevoTotal,
            precioUnit: item.cantidad > 0 ? round2(nuevoTotal / item.cantidad) : nuevoTotal,
          }
        })
      })()
    : items

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario autenticado requerido' }, { status: 401 })
  }

  const tipo: string = body.tipo || 'BOLETA'

  const tipoDocumento = TIPO_DOCUMENTO_CORRELATIVO[tipo]
  const configuracion = await prisma.configuracion.findUnique({ where: { id: 'default' }, select: { ruc: true } })
  if (!configuracion?.ruc) {
    return NextResponse.json({ error: 'RUC del emisor no configurado' }, { status: 400 })
  }

  const serieConfig = await prisma.serie.findFirst({ where: { tipoComprobante: tipoDocumento, estado: 1 } })
  if (!serieConfig) {
    return NextResponse.json({ error: `No hay serie configurada para el tipo de documento ${tipoDocumento}` }, { status: 400 })
  }

  const factura = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.productoId) continue
      const updated = await tx.producto.updateMany({
        where: { id: item.productoId, stock: { gte: item.cantidad } },
        data: { stock: { decrement: item.cantidad } },
      })
      if (updated.count !== 1) {
        throw new Error(`Stock insuficiente para ${item.nombre}`)
      }
    }

    const prefijo = resolverPrefijo(tipoDocumento)
    const numeracionComprobante = await obtenerCorrelativo(tx, {
      ruc: configuracion.ruc!,
      tipoDocumento,
      serie: serieConfig.serie,
      prefijo,
    })

    const gravadas = round2(total / (1 + IGV_PORCENTAJE / 100))
    const igv = round2(gravadas * (IGV_PORCENTAJE / 100))

    const creada = await tx.factura.create({
      data: {
        cliente: { connect: { id: body.clienteId } },
        tipo: tipo as 'BOLETA' | 'FACTURA' | 'NOTA_VENTA',
        total,
        metodoPago: body.metodoPago || 'EFECTIVO',
        estado: body.estado || 'PAGADO',
        descuentoAplicado,
        items: {
          create: itemsFacturados.map((item: any) => {
            const { productoId, ...rest } = item
            return { ...rest, producto: productoId ? { connect: { id: productoId } } : undefined }
          }),
        },
        tipoComprobante: CODIGO_SUNAT_TIPO_COMPROBANTE[tipo] ?? tipo,
        numeracionComprobante,
        fechaHora: new Date(),
        fechaEmision: new Date(),
        totalVenta: String(total),
        gravadas,
        igv,
        montoLetras: numeroALetras(total),
        enviado: false,
        usuario: { connect: { id: session.user.id } },
        ruc: configuracion.ruc,
        pagoEfectivo: body.metodoPago === 'EFECTIVO' ? total : null,
        pagoTarjeta: body.metodoPago === 'TARJETA' ? total : null,
        pagoYape: ['YAPE', 'PLIN'].includes(body.metodoPago) ? total : null,
        pagoTransferencia: body.metodoPago === 'TRANSFERENCIA' ? total : null,
        pagoDeposito: body.metodoPago === 'DEPOSITO' ? total : null,
      },
      include: { cliente: true, items: true, descuento: true },
    })

    if (lineasTratamiento.length > 0) {
      await tx.atencionTratamiento.updateMany({
        where: { id: { in: lineasTratamiento.map((linea) => linea.id) } },
        data: { facturaId: creada.id },
      })
    }
    if (lineasProducto.length > 0) {
      await tx.atencionProducto.updateMany({
        where: { id: { in: lineasProducto.map((linea) => linea.id) } },
        data: { facturaId: creada.id },
      })
    }

    return creada
  })

  const facturaFinal = factura.tipo === 'NOTA_VENTA' ? factura : (await enviarFacturaASunat(factura.id)) ?? factura

  return NextResponse.json(facturaFinal, { status: 201 })
}
