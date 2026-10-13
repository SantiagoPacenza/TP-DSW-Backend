import { Router } from 'express';
import {
  sanitizeMembresiaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './membresia.controller.js';

export const membresiaRouter = Router();

membresiaRouter.get('/', findAll);
membresiaRouter.get('/:id', findOne);
membresiaRouter.post('/', sanitizeMembresiaInput, add);
membresiaRouter.put('/:id', sanitizeMembresiaInput, update);
membresiaRouter.patch('/:id', sanitizeMembresiaInput, update);
membresiaRouter.delete('/:id', remove);