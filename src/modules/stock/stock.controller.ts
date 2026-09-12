import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types';
import * as service from './stock.service';
import { sendSuccess } from '../../utils/response';

const addStockSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
});

export const listStock = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.getAllStock();
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const addStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity, reason } = addStockSchema.parse(req.body);
    const data = await service.addStock(productId, quantity, reason);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const stockLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const productId = parseInt(params['id'] ?? '0', 10);
    const data = await service.getStockLogs(productId);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};
