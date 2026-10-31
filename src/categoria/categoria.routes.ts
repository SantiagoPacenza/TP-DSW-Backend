import { Router } from 'express';
import {
  sanitizeCategoriaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './categoria.controller.js';
import { verificarToken, isAdminEntrenador } from '../auth/auth.middleware.js';

export const categoriaRouter = Router();

categoriaRouter.get('/', verificarToken, findAll);
categoriaRouter.get('/:id', verificarToken, findOne);
categoriaRouter.post('/', verificarToken, isAdminEntrenador, sanitizeCategoriaInput, add);
categoriaRouter.put('/:id', verificarToken, isAdminEntrenador, sanitizeCategoriaInput, update);
categoriaRouter.patch('/:id', verificarToken, isAdminEntrenador, sanitizeCategoriaInput, update);
categoriaRouter.delete('/:id', verificarToken, isAdminEntrenador, remove);
