export type UserRole = 'SUPERVISOR' | 'ADMIN' | 'ESTETICISTA'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}
