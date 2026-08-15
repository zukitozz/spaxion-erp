import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Administrador'

  if (!email || !password) {
    throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD antes de ejecutar el seed.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: passwordHash, role: 'ADMIN' },
    create: { name, email, password: passwordHash, role: 'ADMIN' },
  })

  console.log(`Administrador listo: ${user.email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => prisma.$disconnect())