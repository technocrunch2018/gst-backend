import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin
  const hashedPassword = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@example.com',
      password: hashedPassword,
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // Categories
  const categories = await Promise.all(
    ['Electronics', 'FMCG', 'Stationery', 'Clothing', 'General'].map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  console.log(`${categories.length} categories seeded`);

  // Sample products
  const electronics = categories.find((c) => c.name === 'Electronics');
  const fmcg = categories.find((c) => c.name === 'FMCG');

  if (electronics && fmcg) {
    const products = await Promise.all([
      prisma.product.upsert({
        where: { id: 1 },
        update: {},
        create: {
          name: 'USB-C Cable',
          hsnCode: '8544',
          categoryId: electronics.id,
          sellingPrice: 299,
          gstRate: 18,
          minStock: 10,
          stock: { create: { quantity: 50 } },
        },
      }),
      prisma.product.upsert({
        where: { id: 2 },
        update: {},
        create: {
          name: 'Wireless Mouse',
          hsnCode: '8471',
          categoryId: electronics.id,
          sellingPrice: 799,
          gstRate: 18,
          minStock: 5,
          stock: { create: { quantity: 20 } },
        },
      }),
      prisma.product.upsert({
        where: { id: 3 },
        update: {},
        create: {
          name: 'Drinking Water (1L)',
          hsnCode: '2201',
          categoryId: fmcg.id,
          sellingPrice: 20,
          gstRate: 0,
          minStock: 100,
          stock: { create: { quantity: 500 } },
        },
      }),
    ]);
    console.log(`${products.length} products seeded`);
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
