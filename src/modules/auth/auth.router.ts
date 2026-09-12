import { Router } from 'express';
import { loginHandler, logoutHandler } from './auth.controller';
import { authenticate } from '../../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', loginHandler);
authRouter.post('/logout', authenticate, logoutHandler);
