'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { BrandLogo } from '@/components/BrandLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,140,100,0.12),transparent_35%),linear-gradient(180deg,#f8f7f4,#ffffff)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="page-enter mx-auto max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-soft backdrop-blur-xl sm:p-10">
        <div className="text-center">
          <BrandLogo />
          <p className="mt-4 text-sm uppercase tracking-[0.35em] text-emerald-700/80">Acceso ERP</p>
          <h1 className="mt-4 text-3xl font-semibold text-emerald-900">Bienvenido</h1>
          <p className="mt-2 text-sm text-slate-600">Inicia sesión para gestionar citas, cabinas e inventario.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="text-sm font-medium text-slate-700">Correo electrónico</label>
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
            <label htmlFor="login-password" className="text-sm font-medium text-slate-700">Contraseña</label>
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
      </div>
    </div>
  )
}
