import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './products.controller';

export const productsRouter = Router();

productsRouter.use(authenticate);

productsRouter.get('/', ctrl.list);
productsRouter.get('/:id', ctrl.getOne);
productsRouter.post('/', ctrl.create);
productsRouter.put('/:id', ctrl.update);
productsRouter.delete('/:id', ctrl.remove);
