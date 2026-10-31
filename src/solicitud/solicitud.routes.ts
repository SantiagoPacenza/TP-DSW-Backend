import { Router } from 'express';
import {
  sanitizeSolicitudInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './solicitud.controller.js';
import {
  verificarToken,
  isAdminCliente,
  isAdminEntrenador,
} from '../auth/auth.middleware.js';

export const solicitudRouter = Router();

solicitudRouter.get('/', verificarToken, isAdminEntrenador, findAll);
solicitudRouter.get('/:id', verificarToken, findOne);
solicitudRouter.post('/', verificarToken, isAdminCliente, sanitizeSolicitudInput, add);
solicitudRouter.put('/:id', verificarToken, isAdminEntrenador, sanitizeSolicitudInput, update);
solicitudRouter.patch('/:id', verificarToken, isAdminEntrenador, sanitizeSolicitudInput, update);
solicitudRouter.delete('/:id', verificarToken, isAdminCliente, remove);
