export type UserRole = 'SUPERVISOR' | 'ADMIN' | 'ESTETICISTA'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPERVISOR: 'Gerente',
  ADMIN: 'Administrador',
  ESTETICISTA: 'Esteticista',
}
