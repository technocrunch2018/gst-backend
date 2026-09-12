import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './stock.controller';

export const stockRouter = Router();

stockRouter.use(authenticate);

stockRouter.get('/', ctrl.listStock);
stockRouter.post('/add', ctrl.addStock);
stockRouter.get('/logs/:id', ctrl.stockLogs);
