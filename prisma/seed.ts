import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('shoppinglink2026', 10)

  await prisma.user.upsert({
    where: { email: 'admin@shoppinglink.net' },
    update: {},
    create: {
      email: 'admin@shoppinglink.net',
      password: passwordHash,
      name: 'Admin',
    },
  })

  console.log('Seed complete. Login: admin@shoppinglink.net / shoppinglink2026')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
