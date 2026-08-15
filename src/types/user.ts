export type UserRole = 'SUPERVISOR' | 'ADMIN' | 'OPERADOR' | 'ESTETICISTA'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}
