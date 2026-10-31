import { Router } from 'express';
import {
  sanitizePlanInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './plan.controller.js';

import {
  verificarToken,
  isAdmin,
  isAdminCliente,
} from '../auth/auth.middleware.js';

export const planRouter = Router();

// Consultar planes: clientes y administradores.
planRouter.get('/', verificarToken, isAdminCliente, findAll);
// Consultar un plan por ID: clientes y administradores.
planRouter.get('/:id', verificarToken, isAdminCliente, findOne);
// Crear planes: solo administradores.
planRouter.post('/', verificarToken, isAdmin, sanitizePlanInput, add);
// Modificar o desactivar/reactivar planes: solo administradores.
planRouter.put('/:id', verificarToken, isAdmin, sanitizePlanInput, update);
planRouter.patch('/:id', verificarToken, isAdmin, sanitizePlanInput, update);
// Eliminar físicamente: solo administradores.
planRouter.delete('/:id', verificarToken, isAdmin, remove);