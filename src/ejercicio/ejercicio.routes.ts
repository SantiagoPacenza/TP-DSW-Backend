import { Router } from 'express';
import {
  sanitizeEjercicioInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './ejercicio.controller.js';

export const ejercicioRouter = Router();

ejercicioRouter.get('/', findAll);
ejercicioRouter.get('/:id', findOne);
ejercicioRouter.post('/', sanitizeEjercicioInput, add);
ejercicioRouter.put('/:id', sanitizeEjercicioInput, update);
ejercicioRouter.patch('/:id', sanitizeEjercicioInput, update);
ejercicioRouter.delete('/:id', remove);
