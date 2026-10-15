import { Router } from 'express';
import {
  sanitizeRutinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './rutina.controller.js';

export const rutinaRouter = Router();

rutinaRouter.get('/', findAll);
rutinaRouter.get('/:id', findOne);
rutinaRouter.post('/', sanitizeRutinaInput, add);
rutinaRouter.put('/:id', sanitizeRutinaInput, update);
rutinaRouter.patch('/:id', sanitizeRutinaInput, update);
rutinaRouter.delete('/:id', remove);
