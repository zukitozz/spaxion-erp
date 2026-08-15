import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { auth } from '@/lib/auth'
import { obtenerCorrelativo, resolverPrefijo } from '@/lib/correlativos'

export const dynamic = 'force-dynamic'

function round2(value: number) {
  return Math.round(value * 100) / 100
}

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

  const atencionIds: string[] = Array.isArray(body.atencionIds)
    ? body.atencionIds.filter((id: unknown) => typeof id === 'string')
    : []

  const atencionesPendientes = atencionIds.length > 0
    ? await prisma.atencionCabina.findMany({
        where: { id: { in: atencionIds }, clienteId: body.clienteId, estado: 'FINALIZADA', facturaId: null },
        include: {
          tratamiento: { select: { nombre: true, precio: true } },
          productos: { include: { producto: { select: { nombre: true } } } },
        },
      })
    : []

  const itemsDeAtenciones = atencionesPendientes.flatMap((atencion) => [
    {
      productoId: null as string | null,
      nombre: atencion.tratamiento.nombre,
      cantidad: 1,
      precioUnit: atencion.tratamiento.precio,
      total: round2(atencion.tratamiento.precio),
    },
    ...atencion.productos.map((item) => ({
      productoId: item.productoId as string | null,
      nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precioUnit: item.precioUnit,
      total: round2(item.cantidad * item.precioUnit),
    })),
  ])

  const itemsManuales = body.items
    .filter((item: any) => typeof item.productoId === 'string' && item.productoId.length > 0)
    .map((item: any) => ({
      productoId: item.productoId,
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
  let descuentoAplicado = 0
  let descuentoId: string | null = null

  if (body.descuentoId) {
    const descuento = await prisma.descuento.findUnique({
      where: { id: body.descuentoId },
    })

    if (descuento?.activo) {
      const now = new Date()
      const isValidFrom = !descuento.fechaInicio || now >= descuento.fechaInicio
      const isValidUntil = !descuento.fechaFin || now <= descuento.fechaFin

      if (isValidFrom && isValidUntil) {
        descuentoAplicado = descuento.tipo === 'PORCENTAJE'
          ? round2(subtotal * (descuento.valor / 100))
          : descuento.valor

        if (descuentoAplicado > subtotal) {
          descuentoAplicado = subtotal
        }

        descuentoId = descuento.id
      }
    }
  }

  const total = round2(Math.max(0, subtotal - descuentoAplicado))

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuario autenticado requerido' }, { status: 401 })
  }

  const tipo: string = body.tipo || 'BOLETA'
  const cliente = tipo === 'FACTURA' ? await prisma.cliente.findUnique({ where: { id: body.clienteId }, select: { ruc: true } }) : null

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

    const creada = await tx.factura.create({
      data: {
        cliente: { connect: { id: body.clienteId } },
        tipo: tipo as 'BOLETA' | 'FACTURA' | 'NOTA_VENTA',
        total,
        metodoPago: body.metodoPago || 'EFECTIVO',
        estado: body.estado || 'PAGADO',
        descuentoAplicado,
        descuento: descuentoId ? { connect: { id: descuentoId } } : undefined,
        items: {
          create: items.map((item: any) => {
            const { productoId, ...rest } = item
            return { ...rest, producto: productoId ? { connect: { id: productoId } } : undefined }
          }),
        },
        tipoComprobante: CODIGO_SUNAT_TIPO_COMPROBANTE[tipo] ?? tipo,
        numeracionComprobante,
        fechaHora: new Date(),
        totalVenta: String(total),
        enviado: false,
        usuario: { connect: { id: session.user.id } },
        ruc: cliente?.ruc ?? null,
        pagoEfectivo: body.metodoPago === 'EFECTIVO' ? total : null,
        pagoTarjeta: body.metodoPago === 'TARJETA' ? total : null,
        pagoYape: ['YAPE', 'PLIN'].includes(body.metodoPago) ? total : null,
        pagoTransferencia: body.metodoPago === 'TRANSFERENCIA' ? total : null,
        pagoDeposito: body.metodoPago === 'DEPOSITO' ? total : null,
      },
      include: { cliente: true, items: true, descuento: true },
    })

    if (atencionesPendientes.length > 0) {
      await tx.atencionCabina.updateMany({
        where: { id: { in: atencionesPendientes.map((atencion) => atencion.id) } },
        data: { facturaId: creada.id },
      })
    }

    return creada
  })

  return NextResponse.json(factura, { status: 201 })
}
