import { Router } from 'express';
import {
  sanitizeDisciplinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './disciplina.controller.js';
import { verificarToken, isAdmin } from '../auth/auth.middleware.js';

export const disciplinaRouter = Router();

disciplinaRouter.get('/', findAll);
disciplinaRouter.get('/:id', findOne);
disciplinaRouter.post('/', verificarToken, isAdmin, sanitizeDisciplinaInput, add);
disciplinaRouter.put('/:id', verificarToken, isAdmin, sanitizeDisciplinaInput, update);
disciplinaRouter.patch('/:id', verificarToken, isAdmin, sanitizeDisciplinaInput, update);
disciplinaRouter.delete('/:id', verificarToken, isAdmin, remove);
