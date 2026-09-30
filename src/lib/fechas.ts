// Perú no tiene horario de verano: el offset -05:00 es fijo todo el año, así que se puede
// calcular el rango de un día/mes en hora peruana sin depender del timezone del servidor.
const OFFSET_PERU = '-05:00'

export function rangoDiaPeru(fecha: string) {
  return {
    gte: new Date(`${fecha}T00:00:00${OFFSET_PERU}`),
    lte: new Date(`${fecha}T23:59:59.999${OFFSET_PERU}`),
  }
}

export function rangoMesPeru(mes: string) {
  const [anioStr, mesStr] = mes.split('-')
  const anio = Number(anioStr)
  const mesNum = Number(mesStr)
  const gte = new Date(`${anioStr}-${mesStr}-01T00:00:00${OFFSET_PERU}`)
  const ultimoDia = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate()
  const lte = new Date(`${anioStr}-${mesStr}-${String(ultimoDia).padStart(2, '0')}T23:59:59.999${OFFSET_PERU}`)
  return { gte, lte }
}

export function hoyPeru(): string {
  const ahoraPeru = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }))
  const y = ahoraPeru.getFullYear()
  const m = String(ahoraPeru.getMonth() + 1).padStart(2, '0')
  const d = String(ahoraPeru.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
