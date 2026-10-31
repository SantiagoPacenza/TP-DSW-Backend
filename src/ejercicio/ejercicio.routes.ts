import { Router } from 'express';
import {
  sanitizeEjercicioInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './ejercicio.controller.js';
import { verificarToken, isAdminEntrenador } from '../auth/auth.middleware.js';

export const ejercicioRouter = Router();

ejercicioRouter.get('/', verificarToken, findAll);
ejercicioRouter.get('/:id', verificarToken, findOne);
ejercicioRouter.post('/', verificarToken, isAdminEntrenador, sanitizeEjercicioInput, add);
ejercicioRouter.put('/:id', verificarToken, isAdminEntrenador, sanitizeEjercicioInput, update);
ejercicioRouter.patch('/:id', verificarToken, isAdminEntrenador, sanitizeEjercicioInput, update);
ejercicioRouter.delete('/:id', verificarToken, isAdminEntrenador, remove);
