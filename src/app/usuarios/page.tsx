'use client'

import { useEffect, useState } from 'react'

interface Usuario {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'OPERADOR' | 'ESTETICISTA'
  createdAt: string
}

const initialForm = { name: '', email: '', password: '', role: 'OPERADOR' as Usuario['role'] }

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')

  const load = async () => {
    const response = await fetch('/api/usuarios')
    if (!response.ok) {
      setMessage('No tienes permisos para administrar usuarios.')
      return
    }
    const data = await response.json()
    setUsers(Array.isArray(data) ? data : [])
  }

  useEffect(() => { void load() }, [])

  const createUser = async () => {
    const response = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!response.ok) {
      const data = await response.json()
      setMessage(data.error || 'No se pudo crear el usuario')
      return
    }
    setForm(initialForm)
    setMessage('Usuario creado correctamente.')
    await load()
  }

  const removeUser = async (id: string) => {
    await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Administración</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900">Usuarios y roles</h1>
          <p className="mt-2 text-slate-600">Crea accesos para administradores, supervisores y operadores.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Nuevo usuario</h2>
            <input aria-label="Nombre" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
            <input aria-label="Correo" type="email" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" />
            <input aria-label="Contraseña" type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field" />
            <select aria-label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Usuario['role'] })} className="field">
              <option value="OPERADOR">Operador</option>
              <option value="ESTETICISTA">Esteticista</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Administrador</option>
            </select>
            <button type="button" onClick={() => void createUser()} className="btn-brand w-full">Crear usuario</button>
            {message && <p className="text-sm text-slate-600">{message}</p>}
          </div>
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Usuarios registrados</h2>
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div><p className="font-semibold text-slate-900">{user.name}</p><p className="text-sm text-slate-500">{user.email} · {user.role}</p></div>
                <button type="button" onClick={() => void removeUser(user.id)} className="text-sm text-rose-600">Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}