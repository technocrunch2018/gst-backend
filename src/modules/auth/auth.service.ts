import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../types';

export const login = async (email: string, password: string) => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) throw new AppError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const token = jwt.sign(
    { adminId: admin.id, email: admin.email },
    env.jwtSecret,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: env.jwtExpiresIn } as any
  );

  return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
};
