require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_ROLES = [
  {
    name: 'ADMIN',
    description: 'System administrator',
  },
  {
    name: 'CLIENT',
    description: 'Customer role',
  },
];

async function seedRoles() {
  for (const role of DEFAULT_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      console.log(`Role "${role.name}" already exists, skipping.`);
      continue;
    }

    await prisma.role.create({
      data: {
        name: role.name,
        description: role.description,
        isActive: true,
      },
    });
    console.log(`Role "${role.name}" created.`);
  }
}

async function main() {
  await seedRoles();

  const roles = await prisma.role.findMany({
    where: {
      name: {
        in: DEFAULT_ROLES.map((item) => item.name),
      },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log('Seeded roles:');
  console.log(JSON.stringify(roles, null, 2));
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
