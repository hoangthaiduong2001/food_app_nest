require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Cấu hình test
const INITIAL_STOCK = 5; // kho ban đầu
const CONCURRENT_REQUESTS = 10; // số request mua song song
const QUANTITY_EACH = 1; // mỗi request mua 1

/**
 * Bản reserve CÓ pessimistic lock — copy logic từ PrismaInventoryRepository.
 */
async function reserveWithLock(variantId, quantity) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, sku, stock FROM "ProductVariant"
      WHERE id = ${variantId} AND "deletedAt" IS NULL
      FOR UPDATE
    `;
    const variant = rows[0];
    if (!variant) throw new Error('Variant not found');
    if (variant.stock < quantity) {
      throw new Error(`Insufficient stock (have ${variant.stock})`);
    }
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { decrement: quantity } },
    });
    return true;
  });
}

/**
 * Bản reserve KHÔNG lock — minh hoạ race condition (đọc rồi ghi riêng lẻ).
 */
async function reserveWithoutLock(variantId, quantity) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true },
  });
  if (!variant) throw new Error('Variant not found');
  if (variant.stock < quantity) {
    throw new Error(`Insufficient stock (have ${variant.stock})`);
  }
  // Mô phỏng khoảng trễ giữa đọc và ghi để race condition dễ xảy ra
  await new Promise((r) => setTimeout(r, 10));
  await prisma.productVariant.update({
    where: { id: variantId },
    data: { stock: { decrement: quantity } },
  });
  return true;
}

async function runScenario(label, reserveFn, variantId) {
  // Reset stock về INITIAL_STOCK
  await prisma.productVariant.update({
    where: { id: variantId },
    data: { stock: INITIAL_STOCK },
  });

  // Bắn N request SONG SONG
  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENT_REQUESTS }, () =>
      reserveFn(variantId, QUANTITY_EACH),
    ),
  );

  const success = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  const after = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true },
  });

  console.log(`\n=== ${label} ===`);
  console.log(`Stock ban đầu:        ${INITIAL_STOCK}`);
  console.log(`Request song song:    ${CONCURRENT_REQUESTS} (mỗi cái mua ${QUANTITY_EACH})`);
  console.log(`Thành công:           ${success}`);
  console.log(`Bị từ chối:           ${failed}`);
  console.log(`Stock còn lại:        ${after.stock}`);

  const expectedSuccess = INITIAL_STOCK;
  const oversell = after.stock < 0;
  if (success === expectedSuccess && after.stock === 0 && !oversell) {
    console.log(`✅ ĐÚNG: chỉ ${expectedSuccess} request thành công, không oversell.`);
  } else {
    console.log(`❌ SAI: oversell hoặc số liệu lệch (stock=${after.stock}).`);
  }
}

async function main() {
  // Lấy 1 variant bất kỳ để test
  const variant = await prisma.productVariant.findFirst({
    where: { deletedAt: null },
    select: { id: true, sku: true },
    orderBy: { id: 'asc' },
  });
  if (!variant) {
    throw new Error('No variant found. Run seed-products first.');
  }
  console.log(`Testing on variant id=${variant.id} (sku=${variant.sku})`);

  // 1. Không lock → kỳ vọng OVERSELL (bán quá)
  await runScenario('KHÔNG LOCK (race condition)', reserveWithoutLock, variant.id);

  // 2. Có pessimistic lock → kỳ vọng ĐÚNG
  await runScenario('CÓ PESSIMISTIC LOCK', reserveWithLock, variant.id);

  // Reset lại stock về INITIAL_STOCK cho sạch
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stock: INITIAL_STOCK },
  });
  console.log(`\n(Reset stock variant ${variant.id} về ${INITIAL_STOCK})`);
}

main()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
