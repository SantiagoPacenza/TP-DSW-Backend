import { Router } from 'express';
import {
  sanitizePlanInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './plan.controller.js';

export const planRouter = Router();

planRouter.get('/', findAll);
planRouter.get('/:id', findOne);
planRouter.post('/', sanitizePlanInput, add);
planRouter.put('/:id', sanitizePlanInput, update);
planRouter.patch('/:id', sanitizePlanInput, update);
planRouter.delete('/:id', remove);