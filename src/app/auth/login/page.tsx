'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { BrandLogo } from '@/components/BrandLogo'

function destinoSeguro(callbackUrl: string | null) {
  if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) return '/dashboard'
  return callbackUrl
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (result?.error) {
      setError('Correo o contraseña inválidos')
      return
    }

    router.push(destinoSeguro(searchParams.get('callbackUrl')))
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf6] lg:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,#005a4f_0%,#00483f_50%,#043a31_100%)] px-8 py-10 lg:w-[46%] lg:px-14 lg:py-14">
        <svg width="480" height="480" viewBox="0 0 640 640" className="pointer-events-none absolute -bottom-24 -right-32 opacity-[0.14]" fill="none" stroke="#c19a4b" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M338 38c-30 26-38 60-30 97 8 37 0 72-27 102" />
          <path d="M304 82c-33-28-72-33-105-13 13 33 40 55 78 60" />
          <path d="M316 84c27-37 63-53 105-48-3 40-25 70-63 85" />
          <path d="M312 112c-5 45 5 82 33 110" />
          <path d="M344 136c32-7 52-25 62-53" />
          <path d="M405 84c-5 18-2 35 12 50 13 15 13 33 2 52-13 20-33 30-62 32" />
          <path d="M300 158c-18 23-25 48-18 76" />
        </svg>

        <BrandLogo onDark />

        <div className="relative z-10 max-w-md">
          <p className="font-display text-2xl font-semibold leading-snug text-[#fffdf7] sm:text-3xl">
            Belleza, bienestar y cuidado en cada detalle.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[#a9c6bb]">Panel de gestión · Uso interno</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="page-enter w-full max-w-md">
          <p className="eyebrow">Acceso ERP</p>
          <h1 className="page-heading mt-3 text-3xl">Bienvenida de nuevo</h1>
          <p className="mt-2 text-sm text-slate-600">Inicia sesión para gestionar citas, cabinas, inventario y facturación.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="text-sm font-semibold text-slate-700">Correo electrónico</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field mt-2"
                placeholder="usuario@spaxion.pe"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">Contraseña</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field mt-2"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className="btn-brand w-full">Entrar</button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">Acceso exclusivo para el equipo Spaxión</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
