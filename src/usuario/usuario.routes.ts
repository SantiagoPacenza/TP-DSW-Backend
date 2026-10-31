import { Router } from 'express';
import {
  sanitizeUsuarioInput,
  findAll,
  findOne,
  add,
  update,
  remove,
  actualizarDisciplinas,
} from './usuario.controller.js';
import {
  verificarToken,
  isAdmin,
  isAdminEntrenador,
} from '../auth/auth.middleware.js';

export const usuarioRouter = Router();

usuarioRouter.get('/', verificarToken, isAdminEntrenador, findAll);
usuarioRouter.get('/:id', verificarToken, findOne);
usuarioRouter.post('/', verificarToken, isAdmin, sanitizeUsuarioInput, add);
usuarioRouter.put('/:id', verificarToken, sanitizeUsuarioInput, update);
usuarioRouter.put(
  '/:id/disciplinas',
  verificarToken,
  isAdmin,
  actualizarDisciplinas,
);
usuarioRouter.patch('/:id', verificarToken, sanitizeUsuarioInput, update);
usuarioRouter.delete('/:id', verificarToken, remove);
