import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types';
import * as service from './categories.service';
import { sendSuccess } from '../../utils/response';

const nameSchema = z.object({ name: z.string().min(1).max(100) });

export const list = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.listCategories();
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = nameSchema.parse(req.body);
    const data = await service.createCategory(name);
    sendSuccess(res, data, 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const { name } = nameSchema.parse(req.body);
    const data = await service.updateCategory(id, name);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    await service.deleteCategory(id);
    sendSuccess(res, { message: 'Category deleted' });
  } catch (err) { next(err); }
};
