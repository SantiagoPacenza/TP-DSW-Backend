import { Router } from 'express';
import {
  sanitizeClaseInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './clase.controller.js';
import { verificarToken, isAdminEntrenador } from '../auth/auth.middleware.js';

export const claseRouter = Router();

claseRouter.get('/', findAll);
claseRouter.get('/:id', findOne);
claseRouter.post('/', verificarToken, isAdminEntrenador, sanitizeClaseInput, add);
claseRouter.put('/:id', verificarToken, isAdminEntrenador, sanitizeClaseInput, update);
claseRouter.patch('/:id', verificarToken, isAdminEntrenador, sanitizeClaseInput, update);
claseRouter.delete('/:id', verificarToken, isAdminEntrenador, remove);
