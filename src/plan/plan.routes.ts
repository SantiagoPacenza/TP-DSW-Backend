import { Router } from 'express';
import {
  sanitizePlanInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './plan.controller.js';
import { verificarToken, isAdmin } from '../auth/auth.middleware.js';

export const planRouter = Router();

planRouter.get('/', findAll);
planRouter.get('/:id', findOne);
planRouter.post('/', verificarToken, isAdmin, sanitizePlanInput, add);
planRouter.put('/:id', verificarToken, isAdmin, sanitizePlanInput, update);
planRouter.patch('/:id', verificarToken, isAdmin, sanitizePlanInput, update);
planRouter.delete('/:id', verificarToken, isAdmin, remove);
