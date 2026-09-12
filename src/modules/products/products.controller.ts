import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types';
import * as service from './products.service';
import { sendSuccess } from '../../utils/response';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  hsnCode: z.string().min(1).max(20),
  categoryId: z.number().int().positive(),
  sellingPrice: z.number().positive(),
  gstRate: z.number(),
  unitOfMeasure: z.string().min(1).max(20).optional(),
  minStock: z.number().int().nonnegative().optional(),
});

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, categoryId, gstRate, isActive } = req.query;
    const data = await service.listProducts({
      name: name as string | undefined,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      gstRate: gstRate !== undefined ? parseFloat(gstRate as string) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const data = await service.getProduct(id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = productSchema.parse(req.body);
    const data = await service.createProduct(input);
    sendSuccess(res, data, 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const input = productSchema.partial().parse(req.body);
    const data = await service.updateProduct(id, input);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    await service.deactivateProduct(id);
    sendSuccess(res, { message: 'Product deactivated' });
  } catch (err) { next(err); }
};
