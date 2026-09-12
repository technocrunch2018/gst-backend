import { prisma } from '../../lib/prisma';
import { AppError } from '../../types';

const VALID_GST_RATES = [0, 5, 12, 18, 28];

interface ProductInput {
  name: string;
  hsnCode: string;
  categoryId: number;
  sellingPrice: number;
  gstRate: number;
  unitOfMeasure?: string;
  minStock?: number;
}

export const listProducts = (filters: { name?: string; categoryId?: number; gstRate?: number; isActive?: boolean }) => {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where['isActive'] = filters.isActive;
  else where['isActive'] = true;

  if (filters.name) where['name'] = { contains: filters.name, mode: 'insensitive' };
  if (filters.categoryId) where['categoryId'] = filters.categoryId;
  if (filters.gstRate !== undefined) where['gstRate'] = filters.gstRate;

  return prisma.product.findMany({
    where,
    include: { category: true, stock: true },
    orderBy: { name: 'asc' },
  });
};

export const getProduct = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, stock: true },
  });
  if (!product) throw new AppError(404, 'Product not found');
  return product;
};

export const createProduct = async (input: ProductInput) => {
  if (!VALID_GST_RATES.includes(input.gstRate)) {
    throw new AppError(400, `GST rate must be one of: ${VALID_GST_RATES.join(', ')}%`);
  }
  if (input.sellingPrice <= 0) throw new AppError(400, 'Selling price must be greater than 0');

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new AppError(404, 'Category not found');

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: input.name,
        hsnCode: input.hsnCode,
        categoryId: input.categoryId,
        sellingPrice: input.sellingPrice,
        gstRate: input.gstRate,
        unitOfMeasure: input.unitOfMeasure ?? 'Pcs',
        minStock: input.minStock ?? 5,
      },
    });
    await tx.stock.create({ data: { productId: product.id, quantity: 0 } });
    return product;
  });
};

export const updateProduct = async (id: number, input: Partial<ProductInput>) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, 'Product not found');

  if (input.gstRate !== undefined && !VALID_GST_RATES.includes(input.gstRate)) {
    throw new AppError(400, `GST rate must be one of: ${VALID_GST_RATES.join(', ')}%`);
  }
  if (input.sellingPrice !== undefined && input.sellingPrice <= 0) {
    throw new AppError(400, 'Selling price must be greater than 0');
  }
  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new AppError(404, 'Category not found');
  }

  return prisma.product.update({ where: { id }, data: input });
};

export const deactivateProduct = async (id: number) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, 'Product not found');
  return prisma.product.update({ where: { id }, data: { isActive: false } });
};
