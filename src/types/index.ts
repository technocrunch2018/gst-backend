import { Request } from 'express';

export interface AuthPayload {
  adminId: number;
  email: string;
}

export interface AuthRequest extends Request {
  admin?: AuthPayload;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
