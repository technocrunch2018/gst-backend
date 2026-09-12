import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './reports.controller';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get('/gst', ctrl.gstReport);
reportsRouter.get('/gst/export', ctrl.exportCsv);
