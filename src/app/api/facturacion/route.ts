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

function precioValido(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const facturas = await prisma.factura.findMany({
    where: { activo: true },
    include: { cliente: true, items: true },
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

  // Precio editado en caja para una línea puntual (id de AtencionTratamiento/AtencionProducto ->
  // precio unitario). No es un descuento: reemplaza el precio base acordado y queda registrado
  // junto al precio de catálogo (precioCatalogo) para poder evidenciarlo en los reportes.
  const preciosTratamiento: Record<string, unknown> =
    body.preciosTratamiento && typeof body.preciosTratamiento === 'object' ? body.preciosTratamiento : {}
  const preciosProducto: Record<string, unknown> =
    body.preciosProducto && typeof body.preciosProducto === 'object' ? body.preciosProducto : {}

  const lineasTratamiento = tratamientoLineIds.length > 0
    ? await prisma.atencionTratamiento.findMany({
        where: { id: { in: tratamientoLineIds }, atencion: { clienteId: body.clienteId }, estado: 'FINALIZADA', facturaId: null },
        include: { tratamiento: { select: { nombre: true, precio: true } } },
      })
    : []

  const lineasProducto = productoLineIds.length > 0
    ? await prisma.atencionProducto.findMany({
        where: { id: { in: productoLineIds }, atencion: { clienteId: body.clienteId }, facturaId: null },
        include: { producto: { select: { nombre: true, precioVenta: true } } },
      })
    : []

  const itemsDeAtenciones = [
    ...lineasTratamiento.map((linea) => {
      const precioCatalogo = linea.tratamiento.precio
      const precioUnit = precioValido(preciosTratamiento[linea.id]) ?? linea.precio ?? precioCatalogo
      return {
        productoId: null as string | null,
        nombre: linea.tratamiento.nombre,
        cantidad: 1,
        precioUnit,
        total: round2(precioUnit),
        precioCatalogo,
      }
    }),
    ...lineasProducto.map((item) => {
      const precioCatalogo = item.producto.precioVenta
      const precioUnit = precioValido(preciosProducto[item.id]) ?? item.precioUnit
      return {
        productoId: item.productoId as string | null,
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precioUnit,
        total: round2(item.cantidad * precioUnit),
        precioCatalogo,
      }
    }),
  ]

  // Los items manuales admiten un producto o un tratamiento (sin control de stock en este último caso).
  const itemsManualesBody = body.items.filter((item: any) =>
    (typeof item.productoId === 'string' && item.productoId.length > 0) ||
    (typeof item.tratamientoId === 'string' && item.tratamientoId.length > 0)
  )

  const productoIdsManuales = itemsManualesBody
    .map((item: any) => item.productoId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
  const tratamientoIdsManuales = itemsManualesBody
    .map((item: any) => item.tratamientoId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)

  const [productosCatalogo, tratamientosCatalogo] = await Promise.all([
    productoIdsManuales.length > 0
      ? prisma.producto.findMany({ where: { id: { in: productoIdsManuales } }, select: { id: true, precioVenta: true } })
      : Promise.resolve([] as { id: string; precioVenta: number }[]),
    tratamientoIdsManuales.length > 0
      ? prisma.tratamiento.findMany({ where: { id: { in: tratamientoIdsManuales } }, select: { id: true, precio: true } })
      : Promise.resolve([] as { id: string; precio: number }[]),
  ])
  const precioCatalogoProducto = new Map(productosCatalogo.map((p) => [p.id, p.precioVenta]))
  const precioCatalogoTratamiento = new Map(tratamientosCatalogo.map((t) => [t.id, t.precio]))

  const itemsManuales = itemsManualesBody.map((item: any) => {
    const productoId = typeof item.productoId === 'string' && item.productoId.length > 0 ? item.productoId : null
    const tratamientoId = typeof item.tratamientoId === 'string' && item.tratamientoId.length > 0 ? item.tratamientoId : null
    const cantidad = Number(item.cantidad) || 0
    const precioUnit = Number(item.precioUnit) || 0
    const precioCatalogo = productoId
      ? precioCatalogoProducto.get(productoId)
      : tratamientoId
        ? precioCatalogoTratamiento.get(tratamientoId)
        : undefined
    return {
      productoId,
      nombre: item.nombre,
      cantidad,
      precioUnit,
      total: round2(cantidad * precioUnit),
      precioCatalogo: precioCatalogo ?? null,
    }
  })

  const items = [...itemsDeAtenciones, ...itemsManuales]

  if (items.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un producto o tratamiento pendiente' }, { status: 400 })
  }

  // No se manejan descuentos: el total es la suma directa de los items ya al precio acordado
  // (de catálogo o modificado). Cualquier ajuste de monto se hace cambiando el precio base del
  // item correspondiente, nunca restando un descuento aparte.
  const total = round2(items.reduce((sum: number, item: { total: number }) => sum + item.total, 0))

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
        items: {
          create: items.map((item: any) => {
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
      include: { cliente: true, items: true },
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
