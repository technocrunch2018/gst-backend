import { prisma } from '../../lib/prisma';
import { AppError } from '../../types';

export const listCategories = () =>
  prisma.category.findMany({ orderBy: { name: 'asc' } });

export const createCategory = async (name: string) => {
  const exists = await prisma.category.findUnique({ where: { name } });
  if (exists) throw new AppError(409, 'Category already exists');
  return prisma.category.create({ data: { name } });
};

export const updateCategory = async (id: number, name: string) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(404, 'Category not found');
  const exists = await prisma.category.findFirst({ where: { name, NOT: { id } } });
  if (exists) throw new AppError(409, 'Category name already in use');
  return prisma.category.update({ where: { id }, data: { name } });
};

export const deleteCategory = async (id: number) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(404, 'Category not found');
  const hasProducts = await prisma.product.findFirst({ where: { categoryId: id } });
  if (hasProducts) throw new AppError(409, 'Cannot delete category with existing products');
  return prisma.category.delete({ where: { id } });
};
