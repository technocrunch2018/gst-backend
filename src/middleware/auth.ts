import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, AuthPayload, AppError } from '../types';

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) throw new AppError(401, 'No token provided');

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.admin = payload;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
};
