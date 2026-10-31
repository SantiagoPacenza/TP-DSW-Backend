import { Router } from 'express';
import {
  sanitizeInscripcionInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './inscripcion.controller.js';
import { verificarToken, isAdminCliente } from '../auth/auth.middleware.js';

export const inscripcionRouter = Router();

inscripcionRouter.get('/', verificarToken, findAll);
inscripcionRouter.get('/:clienteId/:claseId/:fechaInscripcion', verificarToken, findOne);
inscripcionRouter.post('/', verificarToken, isAdminCliente, sanitizeInscripcionInput, add);
inscripcionRouter.put('/:clienteId/:claseId/:fechaInscripcion', verificarToken, isAdminCliente, sanitizeInscripcionInput, update);
inscripcionRouter.patch('/:clienteId/:claseId/:fechaInscripcion', verificarToken, isAdminCliente, sanitizeInscripcionInput, update);
inscripcionRouter.delete('/:clienteId/:claseId/:fechaInscripcion', verificarToken, isAdminCliente, remove);
