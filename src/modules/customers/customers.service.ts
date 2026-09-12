import { prisma } from '../../lib/prisma';
import { AppError } from '../../types';

interface CustomerInput {
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
}

// Extract first 2 digits of GSTIN = state code
export const getStateCodeFromGstin = (gstin: string): string => gstin.slice(0, 2);

export const listCustomers = (search?: string) =>
  prisma.customer.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
  });

export const getCustomer = async (id: number) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, 'Customer not found');
  return customer;
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createCustomer = async (input: CustomerInput) => {
  if (input.gstin && !GSTIN_REGEX.test(input.gstin)) {
    throw new AppError(400, 'Invalid GSTIN format');
  }
  return prisma.customer.create({ data: input });
};

export const updateCustomer = async (id: number, input: Partial<CustomerInput>) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, 'Customer not found');
  if (input.gstin && !GSTIN_REGEX.test(input.gstin)) {
    throw new AppError(400, 'Invalid GSTIN format');
  }
  return prisma.customer.update({ where: { id }, data: input });
};

export const deactivateCustomer = async (id: number) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, 'Customer not found');
  return prisma.customer.update({ where: { id }, data: { isActive: false } });
};
