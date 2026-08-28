import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { encryptSecret } from '@/lib/googleCalendar'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const redirectAjustes = (estado: 'ok' | 'error') => NextResponse.redirect(new URL(`/ajustes?calendar=${estado}`, url.origin))

  if (!code) return redirectAjustes('error')

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integraciones/google-calendar/callback`
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) return redirectAjustes('error')
  const tokenData = await tokenResponse.json()
  if (!tokenData.refresh_token) return redirectAjustes('error')

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {}

  await prisma.configuracion.upsert({
    where: { id: 'default' },
    update: {
      googleRefreshTokenEnc: encryptSecret(tokenData.refresh_token),
      googleCuentaEmail: userInfo.email || null,
    },
    create: {
      id: 'default',
      googleRefreshTokenEnc: encryptSecret(tokenData.refresh_token),
      googleCuentaEmail: userInfo.email || null,
    },
  })

  return redirectAjustes('ok')
}
