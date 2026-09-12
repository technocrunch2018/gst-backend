import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types';
import * as service from './customers.service';
import { sendSuccess } from '../../utils/response';

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().optional(),
});

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = req.query['search'] as string | undefined;
    const data = await service.listCustomers(search);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const data = await service.getCustomer(id);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = customerSchema.parse(req.body);
    const data = await service.createCustomer(input);
    sendSuccess(res, data, 201);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    const input = customerSchema.partial().parse(req.body);
    const data = await service.updateCustomer(id, input);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const params = req.params as Record<string, string>;
    const id = parseInt(params['id'] ?? '0', 10);
    await service.deactivateCustomer(id);
    sendSuccess(res, { message: 'Customer deactivated' });
  } catch (err) { next(err); }
};
