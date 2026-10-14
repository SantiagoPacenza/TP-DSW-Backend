
import { Router } from 'express';
import {
  sanitizeSolicitudInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './solicitud.controller.js';

export const solicitudRouter = Router();

solicitudRouter.get('/', findAll);
solicitudRouter.get('/:id', findOne);
solicitudRouter.post('/', sanitizeSolicitudInput, add);
solicitudRouter.put('/:id', sanitizeSolicitudInput, update);
solicitudRouter.patch('/:id', sanitizeSolicitudInput, update);
solicitudRouter.delete('/:id', remove);


