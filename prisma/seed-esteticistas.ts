import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const NOMBRES = ['ORIANNYS', 'JHULIANA', 'BETY', 'GENESIS']

async function main() {
  const dominio = process.env.ESTETICISTA_EMAIL_DOMAIN
  const password = process.env.ESTETICISTA_PASSWORD

  if (!dominio || !password) {
    throw new Error('Define ESTETICISTA_EMAIL_DOMAIN (ej. spaxion.pe) y ESTETICISTA_PASSWORD antes de ejecutar el seed.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  for (const name of NOMBRES) {
    const email = `${name.toLowerCase()}@${dominio}`
    // update no toca la contraseña: re-ejecutar el seed no debe resetear claves ya cambiadas.
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role: 'ESTETICISTA' },
      create: { name, email, password: passwordHash, role: 'ESTETICISTA' },
    })
    console.log(`Esteticista lista: ${user.name} <${user.email}>`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => prisma.$disconnect())
