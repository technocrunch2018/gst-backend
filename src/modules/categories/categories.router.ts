import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './categories.controller';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get('/', ctrl.list);
categoriesRouter.post('/', ctrl.create);
categoriesRouter.put('/:id', ctrl.update);
categoriesRouter.delete('/:id', ctrl.remove);
