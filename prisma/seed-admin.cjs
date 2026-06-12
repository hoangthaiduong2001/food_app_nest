require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = 'admin@techstore.com';
const ADMIN_PASSWORD = 'Admin@123456';

async function main() {
  const adminRole = await prisma.role.findFirst({
    where: { name: 'ADMIN', deletedAt: null },
    select: { id: true },
  });

  if (!adminRole) {
    console.error('ADMIN role not found. Run `node prisma/seed.js` first.');
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({
    where: { email: ADMIN_EMAIL, deletedAt: null },
  });

  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'Admin',
      password: hashedPassword,
      phoneNumber: '0900000000',
      roleId: adminRole.id,
    },
    select: { id: true, email: true, name: true },
  });

  console.log('Admin user created:');
  console.log(`  Email:    ${user.email}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  ID:       ${user.id}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
