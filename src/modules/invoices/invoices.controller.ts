import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';
import { AuthRequest } from '../../types';
import * as service from './invoices.service';
import { generateInvoicePdf } from './pdf.service';
import { sendSuccess } from '../../utils/response';

const createInvoiceSchema = z.object({
  customerId: z.number().int().positive(),
  invoiceDate: z.string().datetime().optional(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      unitOfMeasure: z.string().optional(),
      batchNo: z.string().optional(),
      mfgDate: z.string().optional(),
      expDate: z.string().optional(),
    })
  ).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus),
});

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId, paymentStatus, from, to } = req.query;
    const data = await service.listInvoices({
      customerId: customerId ? parseInt(customerId as string, 10) : undefined,
      paymentStatus: paymentStatus as PaymentStatus | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const data = await service.getInvoice(id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = createInvoiceSchema.parse(req.body);
    const data = await service.createInvoice({
      ...input,
      invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : undefined,
    });
    sendSuccess(res, data, 201);
  } catch (err) { next(err); }
};

export const downloadPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const invoice = await service.getInvoice(id);
    const pdf = await generateInvoicePdf(invoice as Parameters<typeof generateInvoicePdf>[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const { paymentStatus } = statusSchema.parse(req.body);
    const data = await service.updatePaymentStatus(id, paymentStatus);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};
