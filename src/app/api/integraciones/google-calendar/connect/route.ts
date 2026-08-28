import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integraciones/google-calendar/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
