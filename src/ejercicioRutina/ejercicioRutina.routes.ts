import { Router } from 'express';
import {
  sanitizeEjercicioRutinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './ejercicioRutina.controller.js';

export const ejercicioRutinaRouter = Router();

ejercicioRutinaRouter.get('/', findAll);
ejercicioRutinaRouter.get('/:id', findOne);
ejercicioRutinaRouter.post('/', sanitizeEjercicioRutinaInput, add);
ejercicioRutinaRouter.put('/:id', sanitizeEjercicioRutinaInput, update);
ejercicioRutinaRouter.patch('/:id', sanitizeEjercicioRutinaInput, update);
ejercicioRutinaRouter.delete('/:id', remove);
