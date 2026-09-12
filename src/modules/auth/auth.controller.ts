import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const logoutHandler = (_req: Request, res: Response) => {
  // JWT is stateless; client should discard token
  sendSuccess(res, { message: 'Logged out successfully' });
};
