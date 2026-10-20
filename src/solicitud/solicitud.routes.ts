
import { Router } from 'express';
import {
  sanitizeSolicitudInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './solicitud.controller.js';
import { verificarToken, isCliente , isAdminEntrenador } from '../auth/auth.middleware.js';

export const solicitudRouter = Router();

solicitudRouter.get('/'       , verificarToken, isAdminEntrenador, findAll);
solicitudRouter.get('/:id'    , verificarToken, findOne); // Los 3
solicitudRouter.post('/'      , verificarToken, isCliente, sanitizeSolicitudInput, add);
solicitudRouter.put('/:id'    , verificarToken, isAdminEntrenador, sanitizeSolicitudInput, update);
solicitudRouter.patch('/:id'  , verificarToken, isAdminEntrenador, sanitizeSolicitudInput, update);
solicitudRouter.delete('/:id' , verificarToken, isCliente, remove);


