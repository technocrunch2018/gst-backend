import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './customers.controller';

export const customersRouter = Router();

customersRouter.use(authenticate);

customersRouter.get('/', ctrl.list);
customersRouter.get('/:id', ctrl.getOne);
customersRouter.post('/', ctrl.create);
customersRouter.put('/:id', ctrl.update);
customersRouter.delete('/:id', ctrl.remove);
