import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './invoices.controller';

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);

invoicesRouter.get('/', ctrl.list);
invoicesRouter.post('/', ctrl.create);
invoicesRouter.get('/:id', ctrl.getOne);
invoicesRouter.get('/:id/pdf', ctrl.downloadPdf);
invoicesRouter.patch('/:id/status', ctrl.updateStatus);
