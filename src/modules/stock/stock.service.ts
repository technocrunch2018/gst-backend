import { prisma } from '../../lib/prisma';
import { AppError } from '../../types';

export const getAllStock = () =>
  prisma.stock.findMany({
    include: {
      product: { include: { category: true } },
    },
    orderBy: { product: { name: 'asc' } },
  });

export const addStock = async (productId: number, quantity: number, reason = 'manual_add') => {
  if (quantity <= 0) throw new AppError(400, 'Quantity must be positive');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw new AppError(404, 'Product not found');

  return prisma.$transaction(async (tx) => {
    const stock = await tx.stock.upsert({
      where: { productId },
      update: { quantity: { increment: quantity } },
      create: { productId, quantity },
    });
    await tx.stockLog.create({
      data: { productId, changeQty: quantity, reason },
    });
    return stock;
  });
};

export const getStockLogs = async (productId: number) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(404, 'Product not found');

  return prisma.stockLog.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
};
