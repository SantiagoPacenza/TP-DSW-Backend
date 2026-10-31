import { Router } from 'express';
import {
  sanitizeMembresiaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './membresia.controller.js';
import {
  verificarToken,
  isAdmin,
  isAdminCliente,
} from '../auth/auth.middleware.js';

export const membresiaRouter = Router();

membresiaRouter.get('/', verificarToken, findAll);
membresiaRouter.get('/:id', verificarToken, findOne);
membresiaRouter.post('/', verificarToken, isAdminCliente, sanitizeMembresiaInput, add);
membresiaRouter.put('/:id', verificarToken, isAdmin, sanitizeMembresiaInput, update);
membresiaRouter.patch('/:id', verificarToken, isAdmin, sanitizeMembresiaInput, update);
membresiaRouter.delete('/:id', verificarToken, isAdmin, remove);
