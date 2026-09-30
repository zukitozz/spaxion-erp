/** Código SUNAT del tipo de comprobante (catálogo 01: Factura, 03: Boleta); NOTA_VENTA no tiene código SUNAT. */
export const CODIGO_SUNAT_TIPO_COMPROBANTE: Record<string, string | null> = {
  BOLETA: '03',
  FACTURA: '01',
  NOTA_VENTA: null,
}

/** Tipo de documento usado para obtener el correlativo (incluye '51' para nota de venta, sin código SUNAT). */
export const TIPO_DOCUMENTO_CORRELATIVO: Record<string, string> = {
  BOLETA: '03',
  FACTURA: '01',
  NOTA_VENTA: '51',
}
