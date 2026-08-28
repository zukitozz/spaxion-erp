'use client'

import { useEffect, useState } from 'react'

interface Usuario {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'ESTETICISTA'
  celular1: string | null
  celular2: string | null
  createdAt: string
}

const emptyForm = { name: '', email: '', password: '', role: 'ESTETICISTA' as Usuario['role'], celular1: '', celular2: '' }

function submitLabel(loading: boolean, editingId: string | null) {
  if (loading) return 'Guardando...'
  if (editingId) return 'Actualizar usuario'
  return 'Crear usuario'
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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

  const saveUser = async () => {
    setLoading(true)
    setMessage('')

    const response = await fetch('/api/usuarios', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: editingId || undefined }),
    })

    const result = await response.json()
    if (!response.ok) {
      setMessage(result.error || 'No se pudo guardar el usuario')
      setLoading(false)
      return
    }

    setUsers((prev) => editingId ? prev.map((item) => item.id === editingId ? result : item) : [result, ...prev])
    setForm(emptyForm)
    setEditingId(null)
    setMessage(editingId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.')
    setLoading(false)
  }

  const editUser = (user: Usuario) => {
    setEditingId(user.id)
    setMessage('')
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      celular1: user.celular1 || '',
      celular2: user.celular2 || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
  }

  const removeUser = async (id: string) => {
    await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' })
    if (editingId === id) cancelEdit()
    await load()
  }

  return (
    <main className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Administración</p>
          <h1 className="mt-3 page-heading text-3xl">Usuarios y roles</h1>
          <p className="mt-2 text-slate-600">Crea y edita accesos para administradores y esteticistas.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="card-surface space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-emerald-900">{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              {editingId && <button type="button" onClick={cancelEdit} className="text-sm text-slate-500">Cancelar</button>}
            </div>
            <input aria-label="Nombre" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
            <input aria-label="Correo" type="email" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" />
            <input
              aria-label="Contraseña"
              type="password"
              placeholder={editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="field"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input aria-label="Celular 1" placeholder="Celular 1" value={form.celular1} onChange={(e) => setForm({ ...form, celular1: e.target.value })} className="field" />
              <input aria-label="Celular 2" placeholder="Celular 2" value={form.celular2} onChange={(e) => setForm({ ...form, celular2: e.target.value })} className="field" />
            </div>
            <select aria-label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Usuario['role'] })} className="field">
              <option value="ESTETICISTA">Esteticista</option>
              <option value="ADMIN">Administrador</option>
              {form.role === 'SUPERVISOR' && <option value="SUPERVISOR" disabled>Supervisor (no se pueden crear más)</option>}
            </select>
            <button type="button" disabled={loading || !form.name || !form.email} onClick={() => void saveUser()} className="btn-brand w-full disabled:opacity-60">
              {submitLabel(loading, editingId)}
            </button>
            {message && <p className="text-sm text-slate-600">{message}</p>}
          </div>
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Usuarios registrados</h2>
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.email} · {user.role}</p>
                  {(user.celular1 || user.celular2) && (
                    <p className="mt-1 text-sm text-slate-500">
                      Cel: {[user.celular1, user.celular2].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-4">
                  <button type="button" onClick={() => editUser(user)} className="text-sm font-semibold text-emerald-700">Editar</button>
                  <button type="button" onClick={() => void removeUser(user.id)} className="text-sm text-rose-600">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
