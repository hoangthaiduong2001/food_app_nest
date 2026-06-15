require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const sellers = await db.seller.findMany({ where: { deletedAt: null }, select: { id: true } });

  for (const seller of sellers) {
    const products = await db.product.findMany({
      where: { sellerId: seller.id, deletedAt: null },
      select: { brandId: true, categories: { select: { id: true } } },
    });

    const categoryIds = [...new Set(products.flatMap(p => p.categories.map(c => c.id)))];
    const brandIds    = [...new Set(products.map(p => p.brandId).filter(id => id !== null))];

    await db.seller.update({
      where: { id: seller.id },
      data: {
        categories: { set: categoryIds.map(id => ({ id })) },
        brands:     { set: brandIds.map(id => ({ id })) },
      },
    });

    console.log(`Seller ${seller.id} → ${categoryIds.length} categories, ${brandIds.length} brands`);
  }

  console.log('Done.');
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); process.exit(1); });
