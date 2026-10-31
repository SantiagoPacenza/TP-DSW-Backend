import { Router } from 'express';
import {
  sanitizeRutinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './rutina.controller.js';
import { verificarToken, isAdminEntrenador } from '../auth/auth.middleware.js';

export const rutinaRouter = Router();

rutinaRouter.get('/', verificarToken, findAll);
rutinaRouter.get('/:id', verificarToken, findOne);
rutinaRouter.post('/', verificarToken, isAdminEntrenador, sanitizeRutinaInput, add);
rutinaRouter.put('/:id', verificarToken, isAdminEntrenador, sanitizeRutinaInput, update);
rutinaRouter.patch('/:id', verificarToken, isAdminEntrenador, sanitizeRutinaInput, update);
rutinaRouter.delete('/:id', verificarToken, isAdminEntrenador, remove);
