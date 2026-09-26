export interface TicketClienteInfo {
  nombre: string
  dni?: string | null
  ruc?: string | null
  carnetExtranjeria?: string | null
  razonSocial?: string | null
}

export interface TicketItemInfo {
  nombre: string
  cantidad: number
  precioUnit: number
  total: number
}

export interface TicketFacturaInfo {
  tipo: 'BOLETA' | 'FACTURA' | 'NOTA_VENTA'
  numeracionComprobante: string | null
  fechaHora: string | null
  metodoPago: string
  total: number
  gravadas?: number | null
  igv?: number | null
  montoLetras?: string | null
  cliente: TicketClienteInfo
  items: TicketItemInfo[]
}

export interface TicketEmpresaInfo {
  nombreEmpresa: string
  ruc?: string | null
  razonSocial?: string | null
  direccionFiscal?: string | null
}

const NOMBRE_TIPO: Record<string, string> = {
  BOLETA: 'BOLETA DE VENTA ELECTRÓNICA',
  FACTURA: 'FACTURA ELECTRÓNICA',
}

const NOMBRE_METODO_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito en cuenta',
}

/** Solo boletas y facturas se imprimen como ticket; las notas de venta no llevan comprobante SUNAT. */
export function puedeImprimirTicket(tipo: string): boolean {
  return tipo === 'BOLETA' || tipo === 'FACTURA'
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char
  ))
}

function construirHtmlTicket(factura: TicketFacturaInfo, empresa: TicketEmpresaInfo): string {
  const esFactura = factura.tipo === 'FACTURA'
  const nombreCliente = esFactura && factura.cliente.razonSocial ? factura.cliente.razonSocial : factura.cliente.nombre
  const documentoCliente = esFactura
    ? (factura.cliente.ruc ? `RUC: ${factura.cliente.ruc}` : '')
    : factura.cliente.dni
      ? `DNI: ${factura.cliente.dni}`
      : factura.cliente.carnetExtranjeria
        ? `CE: ${factura.cliente.carnetExtranjeria}`
        : ''

  const filasItems = factura.items.map((item) => `
    <div class="fila-item">
      <span>${item.cantidad} x ${escapeHtml(item.nombre)}</span>
      <span>S/ ${item.total.toFixed(2)}</span>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Ticket</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  /* Peso de fuente alto en todo el ticket: las impresoras térmicas dithean el
     antialiasing del texto normal y sale borroso; en negrita/semibold los
     trazos son lo bastante gruesos como para imprimirse nítidos. */
  body { width: 76mm; margin: 0 auto; padding: 2mm 3mm; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 600; color: #000; }
  .centrado { text-align: center; }
  .separador { border-top: 1px dashed #000; margin: 6px 0; }
  .fila { display: flex; justify-content: space-between; gap: 8px; }
  .fila-item { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  h1 { font-size: 14px; margin: 0 0 2px; font-weight: 700; }
  p { margin: 0; }
  .total { font-size: 14px; font-weight: 700; }
</style>
</head>
<body>
  <div class="centrado">
    <h1>${escapeHtml(empresa.nombreEmpresa)}</h1>
    ${empresa.ruc ? `<p>RUC: ${escapeHtml(empresa.ruc)}</p>` : ''}
    ${empresa.direccionFiscal ? `<p>${escapeHtml(empresa.direccionFiscal)}</p>` : ''}
  </div>
  <div class="separador"></div>
  <div class="centrado">
    <p><strong>${NOMBRE_TIPO[factura.tipo] || factura.tipo}</strong></p>
    <p>${escapeHtml(factura.numeracionComprobante || 'Sin numeración')}</p>
  </div>
  <div class="separador"></div>
  <p>Fecha: ${factura.fechaHora ? new Date(factura.fechaHora).toLocaleString('es-PE') : '-'}</p>
  <p>Cliente: ${escapeHtml(nombreCliente)}</p>
  ${documentoCliente ? `<p>${documentoCliente}</p>` : ''}
  <div class="separador"></div>
  ${filasItems}
  <div class="separador"></div>
  ${factura.gravadas != null ? `<div class="fila"><span>Op. gravada</span><span>S/ ${factura.gravadas.toFixed(2)}</span></div>` : ''}
  ${factura.igv != null ? `<div class="fila"><span>IGV (18%)</span><span>S/ ${factura.igv.toFixed(2)}</span></div>` : ''}
  <div class="fila total"><span>TOTAL</span><span>S/ ${factura.total.toFixed(2)}</span></div>
  ${factura.montoLetras ? `<p>Son: ${escapeHtml(factura.montoLetras)}</p>` : ''}
  <p>Método de pago: ${NOMBRE_METODO_PAGO[factura.metodoPago] || factura.metodoPago}</p>
  <div class="separador"></div>
  <p class="centrado">¡Gracias por su preferencia!</p>
</body>
</html>`
}

function obtenerIframeImpresion(): HTMLIFrameElement {
  const existente = document.getElementById('ticket-print-frame') as HTMLIFrameElement | null
  if (existente) return existente

  const iframe = document.createElement('iframe')
  iframe.id = 'ticket-print-frame'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  return iframe
}

/** Imprime el ticket en la impresora predeterminada de Windows vía el diálogo nativo del navegador. */
export function imprimirTicket(factura: TicketFacturaInfo, empresa: TicketEmpresaInfo): void {
  if (typeof window === 'undefined' || !puedeImprimirTicket(factura.tipo)) return

  const iframe = obtenerIframeImpresion()
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(construirHtmlTicket(factura, empresa))
  doc.close()

  const disparar = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }
  iframe.onload = () => setTimeout(disparar, 150)
}
