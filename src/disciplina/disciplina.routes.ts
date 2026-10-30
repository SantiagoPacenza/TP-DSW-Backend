import { Router } from 'express';
import {
  sanitizeDisciplinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './disciplina.controller.js';

export const disciplinaRouter = Router();

disciplinaRouter.get('/', findAll);
disciplinaRouter.get('/:id', findOne);
disciplinaRouter.post('/', sanitizeDisciplinaInput, add);
disciplinaRouter.put('/:id', sanitizeDisciplinaInput, update);
disciplinaRouter.patch('/:id', sanitizeDisciplinaInput, update);
disciplinaRouter.delete('/:id', remove);
