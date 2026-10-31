import { Router } from 'express';
import {
  sanitizeEjercicioRutinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './ejercicioRutina.controller.js';
import { verificarToken, isAdminEntrenador } from '../auth/auth.middleware.js';

export const ejercicioRutinaRouter = Router();

ejercicioRutinaRouter.get('/', verificarToken, findAll);
ejercicioRutinaRouter.get('/:id', verificarToken, findOne);
ejercicioRutinaRouter.post('/', verificarToken, isAdminEntrenador, sanitizeEjercicioRutinaInput, add);
ejercicioRutinaRouter.put('/:id', verificarToken, isAdminEntrenador, sanitizeEjercicioRutinaInput, update);
ejercicioRutinaRouter.patch('/:id', verificarToken, isAdminEntrenador, sanitizeEjercicioRutinaInput, update);
ejercicioRutinaRouter.delete('/:id', verificarToken, isAdminEntrenador, remove);
