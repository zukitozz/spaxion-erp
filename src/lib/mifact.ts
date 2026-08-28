import type { Cliente, Configuracion, Factura, FacturaItem } from '@prisma/client'

const IGV_PORCENTAJE = Number(process.env.IGV_PORCENTAJE || '18')

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function hoy(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

interface Item {
  COD_ITEM: string
  COD_UNID_ITEM: 'NIU' | 'ZZ'
  CANT_UNID_ITEM: string
  VAL_UNIT_ITEM: string
  PRC_VTA_UNIT_ITEM: string
  VAL_VTA_ITEM: string
  MNT_PV_ITEM: string
  COD_TIP_AFECT_IGV_ITEM: string
  COD_TRIB_IGV_ITEM: string
  POR_IGV_ITEM: string
  MNT_IGV_ITEM: string
  TXT_DESC_ITEM: string
}

function construirItem(item: FacturaItem & { producto?: { codigoBarras: string | null } | null }): Item {
  const valorVenta = round2(item.total / (1 + IGV_PORCENTAJE / 100))
  const igv = round2(item.total - valorVenta)
  const esProducto = Boolean(item.productoId)

  return {
    COD_ITEM: item.producto?.codigoBarras || item.codigoProducto || `SERV-${item.id.slice(0, 8)}`,
    COD_UNID_ITEM: esProducto ? 'NIU' : 'ZZ',
    CANT_UNID_ITEM: String(item.cantidad),
    VAL_UNIT_ITEM: (valorVenta / item.cantidad).toFixed(4),
    PRC_VTA_UNIT_ITEM: item.precioUnit.toFixed(2),
    VAL_VTA_ITEM: valorVenta.toFixed(2),
    MNT_PV_ITEM: item.total.toFixed(2),
    COD_TIP_AFECT_IGV_ITEM: '10',
    COD_TRIB_IGV_ITEM: '1000',
    POR_IGV_ITEM: String(IGV_PORCENTAJE),
    MNT_IGV_ITEM: igv.toFixed(2),
    TXT_DESC_ITEM: item.nombre,
  }
}

/**
 * Catálogo 06 SUNAT (tipo de documento de identidad): 1=DNI, 6=RUC.
 * Una Factura exige RUC; una Boleta acepta DNI o RUC.
 */
function datosReceptor(cliente: Cliente, tipoComprobante: string) {
  if (cliente.ruc) {
    return { COD_TIP_NIF_RECP: '6', NUM_NIF_RECP: cliente.ruc, NOM_RZN_SOC_RECP: cliente.razonSocial || cliente.nombre }
  }
  if (tipoComprobante === '01') {
    throw new Error('El cliente no tiene RUC registrado: una Factura exige RUC del receptor')
  }
  if (cliente.dni) {
    return { COD_TIP_NIF_RECP: '1', NUM_NIF_RECP: cliente.dni, NOM_RZN_SOC_RECP: cliente.nombre }
  }
  throw new Error('El cliente no tiene DNI ni RUC registrado, requerido para emitir el comprobante')
}

export interface FacturaParaEnvio extends Factura {
  cliente: Cliente
  items: (FacturaItem & { producto?: { codigoBarras: string | null } | null })[]
}

export interface ResultadoMifact {
  exito: boolean
  errors: string
  url: string
  codigoHash: string
  cadenaParaCodigoQr: string
  pdfBytes: string | null
  raw: unknown
}

export async function enviarComprobante(factura: FacturaParaEnvio, configuracion: Configuracion): Promise<ResultadoMifact> {
  const endpoint = process.env.MIFACT_ENDPOINT
  const token = process.env.MIFACT_TOKEN
  const rucEmisor = process.env.MIFACT_RUC_EMISOR
  if (!endpoint || !token || !rucEmisor) {
    throw new Error('Faltan variables de entorno MIFACT_ENDPOINT/MIFACT_TOKEN/MIFACT_RUC_EMISOR')
  }
  if (!factura.numeracionComprobante || !factura.tipoComprobante) {
    throw new Error('La factura no tiene numeración/tipo de comprobante asignado')
  }

  const [serie, correlativo] = factura.numeracionComprobante.split('-')
  const receptor = datosReceptor(factura.cliente, factura.tipoComprobante)

  const payload = {
    TOKEN: token,
    COD_TIP_NIF_EMIS: '6',
    NUM_NIF_EMIS: rucEmisor,
    NOM_RZN_SOC_EMIS: configuracion.razonSocial || configuracion.nombreEmpresa,
    NOM_COMER_EMIS: '',
    COD_UBI_EMIS: configuracion.codigoUbigeo || '',
    TXT_DMCL_FISC_EMIS: configuracion.direccionFiscal || '',
    ...receptor,
    FEC_EMIS: hoy(factura.fechaEmision || factura.creadoAt),
    COD_TIP_CPE: factura.tipoComprobante,
    NUM_SERIE_CPE: serie,
    NUM_CORRE_CPE: correlativo,
    COD_MND: factura.tipoMoneda || 'PEN',
    MNT_TOT_GRAVADO: (factura.gravadas ?? 0).toFixed(2),
    MNT_TOT_TRIB_IGV: (factura.igv ?? 0).toFixed(2),
    MNT_TOT: factura.total.toFixed(2),
    COD_TIP_OPE_SUNAT: factura.tipoOperacion || '0101',
    ENVIAR_A_SUNAT: 'true',
    RETORNA_XML_ENVIO: 'true',
    RETORNA_XML_CDR: 'true',
    RETORNA_PDF: 'true',
    COD_FORM_IMPR: '001',
    TXT_VERS_UBL: '2.1',
    TXT_VERS_ESTRUCT_UBL: '2.0',
    COD_ANEXO_EMIS: '0000',
    items: factura.items.map(construirItem),
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  const errors: string = data.errors || (response.ok ? '' : `HTTP ${response.status}`)

  return {
    exito: !errors,
    errors,
    url: data.url || '',
    codigoHash: data.codigo_hash || '',
    cadenaParaCodigoQr: data.cadena_para_codigo_qr || '',
    pdfBytes: data.pdf_bytes || null,
    raw: data,
  }
}
