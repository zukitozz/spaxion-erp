import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { prisma } from '@/lib/prisma'

const TIME_ZONE = 'America/Lima'
const DNI_RE = /\b\d{8}\b/
const RUC_RE = /\b\d{11}\b/

let cachedKey: Buffer | null = null

function encryptionKey() {
  if (cachedKey) return cachedKey
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET no está configurado')
  cachedKey = scryptSync(secret, 'google-calendar-salt', 32)
  return cachedKey
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.')
}

export function decryptSecret(value: string) {
  const [ivB64, tagB64, dataB64] = value.split('.')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return plain.toString('utf8')
}

async function getConfiguracion() {
  return prisma.configuracion.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
}

async function getAccessToken(): Promise<string | null> {
  const configuracion = await getConfiguracion()
  if (!configuracion.googleCalendarActivo || !configuracion.googleRefreshTokenEnc) return null

  const refreshToken = decryptSecret(configuracion.googleRefreshTokenEnc)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) return null
  const data = await response.json()
  return data.access_token || null
}

interface ClienteEvento {
  id: string
  nombre: string
  dni: string | null
  ruc: string | null
}

interface CitaEvento {
  id: string
  fecha: Date
  tratamiento: string
  duracionMin?: number | null
  estado: string
  googleEventId?: string | null
  cliente: ClienteEvento | null
}

function eventoDesdeCita(cita: CitaEvento) {
  const start = new Date(cita.fecha)
  const end = new Date(start.getTime() + (cita.duracionMin || 60) * 60 * 1000)
  const documento = cita.cliente?.dni || cita.cliente?.ruc || ''
  const descripcionCliente = cita.cliente
    ? `Cliente: ${cita.cliente.nombre}${documento ? ` (${documento})` : ''}`
    : 'Cliente: sin asignar'

  return {
    summary: cita.cliente ? `${cita.tratamiento} · ${cita.cliente.nombre}` : cita.tratamiento,
    description: `${descripcionCliente}\nEstado: ${cita.estado}\nRegistrado en Spaxión ERP.`,
    start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
    extendedProperties: {
      private: {
        citaId: cita.id,
        clienteId: cita.cliente?.id || '',
      },
    },
  }
}

export async function crearEvento(cita: CitaEvento): Promise<string | null> {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) return null
    const configuracion = await getConfiguracion()
    const calendarId = configuracion.googleCalendarId || 'primary'

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventoDesdeCita(cita)),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.id || null
  } catch {
    return null
  }
}

export async function actualizarEvento(cita: CitaEvento): Promise<void> {
  if (!cita.googleEventId) return
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) return
    const configuracion = await getConfiguracion()
    const calendarId = configuracion.googleCalendarId || 'primary'

    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${cita.googleEventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventoDesdeCita(cita)),
    })
  } catch {
    // best-effort: un fallo de Calendar no debe tumbar la operación local
  }
}

export async function eliminarEvento(googleEventId: string): Promise<void> {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) return
    const configuracion = await getConfiguracion()
    const calendarId = configuracion.googleCalendarId || 'primary'

    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    // best-effort
  }
}

export interface GoogleEvent {
  id: string
  status: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  extendedProperties?: { private?: { citaId?: string; clienteId?: string } }
}

export async function listarEventos(syncToken: string | null): Promise<{ events: GoogleEvent[]; nextSyncToken: string | null }> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { events: [], nextSyncToken: syncToken }

  const configuracion = await getConfiguracion()
  const calendarId = configuracion.googleCalendarId || 'primary'
  const events: GoogleEvent[] = []
  let pageToken: string | undefined
  let nextSyncToken: string | null = syncToken
  let tokenInvalido = false

  do {
    const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true' })
    if (pageToken) params.set('pageToken', pageToken)
    if (syncToken && !tokenInvalido) {
      params.set('syncToken', syncToken)
    } else {
      params.set('timeMin', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (response.status === 410 && syncToken && !tokenInvalido) {
      tokenInvalido = true
      pageToken = undefined
      continue
    }
    if (!response.ok) break

    const data = await response.json()
    events.push(...(data.items || []))
    pageToken = data.nextPageToken
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken
  } while (pageToken)

  return { events, nextSyncToken }
}

export async function matchCliente(evento: GoogleEvent): Promise<ClienteEvento | null> {
  const clienteIdExtendido = evento.extendedProperties?.private?.clienteId
  if (clienteIdExtendido) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteIdExtendido } })
    if (cliente) return cliente
  }

  const texto = `${evento.summary || ''} ${evento.description || ''}`
  const dni = texto.match(DNI_RE)?.[0]
  const ruc = texto.match(RUC_RE)?.[0]

  if (dni) {
    const cliente = await prisma.cliente.findUnique({ where: { dni } })
    if (cliente) return cliente
  }
  if (ruc) {
    const cliente = await prisma.cliente.findUnique({ where: { ruc } })
    if (cliente) return cliente
  }

  // Coincidencia por nombre: el nombre del cliente puede aparecer en cualquier
  // parte del título/descripción (ej. "botox - Jorge Castillo"), no solo como
  // texto exacto. Se prueba primero el nombre más largo para evitar falsos
  // positivos de nombres cortos contenidos en otros más específicos.
  const textoNormalizado = texto.toLowerCase()
  const clientes = await prisma.cliente.findMany()
  const candidatos = clientes
    .filter((cliente) => textoNormalizado.includes(cliente.nombre.toLowerCase()))
    .sort((a, b) => b.nombre.length - a.nombre.length)

  return candidatos[0] ?? null
}
