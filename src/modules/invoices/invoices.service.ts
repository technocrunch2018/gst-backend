import Decimal from 'decimal.js';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../types';
import { isInterState, calculateLineItem } from './gst';
import { PaymentStatus } from '@prisma/client';

interface InvoiceItemInput {
  productId: number;
  quantity: number;
  unitOfMeasure?: string;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
}

interface CreateInvoiceInput {
  customerId: number;
  invoiceDate?: Date;
  items: InvoiceItemInput[];
  notes?: string;
}

// Generate invoice number: INV-YYYY-NNNN
const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const lastNum = last ? parseInt(last.invoiceNumber.split('-').pop() ?? '0', 10) : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
};

export const listInvoices = (filters: {
  customerId?: number;
  paymentStatus?: PaymentStatus;
  from?: Date;
  to?: Date;
}) => {
  const where: Record<string, unknown> = {};
  if (filters.customerId) where['customerId'] = filters.customerId;
  if (filters.paymentStatus) where['paymentStatus'] = filters.paymentStatus;
  if (filters.from || filters.to) {
    where['invoiceDate'] = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  return prisma.invoice.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const getInvoice = async (id: number) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return invoice;
};

export const createInvoice = async (input: CreateInvoiceInput) => {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer || !customer.isActive) throw new AppError(404, 'Customer not found');

  const interState = isInterState(customer.gstin);

  // Validate products and stock
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { stock: true },
  });

  if (products.length !== productIds.length) throw new AppError(400, 'One or more products not found');

  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new AppError(400, `Product ${item.productId} not found`);
    const currentStock = product.stock?.quantity ?? 0;
    if (currentStock < item.quantity) {
      throw new AppError(400, `Insufficient stock for "${product.name}". Available: ${currentStock}`);
    }
  }

  const invoiceNumber = await generateInvoiceNumber();
  const invoiceDate = input.invoiceDate ?? new Date();

  return prisma.$transaction(async (tx) => {
    let subtotal = new Decimal(0);
    let totalCgst = new Decimal(0);
    let totalSgst = new Decimal(0);
    let totalIgst = new Decimal(0);

    const itemsData = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const calc = calculateLineItem(
        {
          unitPrice: Number(product.sellingPrice),
          quantity: item.quantity,
          gstRate: Number(product.gstRate),
        },
        interState
      );

      subtotal = subtotal.plus(calc.taxableValue);
      totalCgst = totalCgst.plus(calc.cgstAmount);
      totalSgst = totalSgst.plus(calc.sgstAmount);
      totalIgst = totalIgst.plus(calc.igstAmount);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure ?? 'Pcs',
        batchNo: item.batchNo,
        mfgDate: item.mfgDate,
        expDate: item.expDate,
        unitPrice: calc.unitPrice,
        gstRate: calc.gstRate,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        lineTotal: calc.lineTotal,
      };
    });

    const totalAmount = subtotal.plus(totalCgst).plus(totalSgst).plus(totalIgst);

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: input.customerId,
        invoiceDate,
        subtotal,
        totalCgst,
        totalSgst,
        totalIgst,
        totalAmount,
        notes: input.notes,
        items: { create: itemsData },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    // Deduct stock for each item
    for (const item of input.items) {
      await tx.stock.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockLog.create({
        data: {
          productId: item.productId,
          changeQty: -item.quantity,
          reason: 'sale',
          referenceId: invoice.id,
        },
      });
    }

    return invoice;
  });
};

export const updatePaymentStatus = async (id: number, status: PaymentStatus) => {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return prisma.invoice.update({ where: { id }, data: { paymentStatus: status } });
};
