import { Router } from 'express';
import {
  sanitizeCategoriaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './categoria.controller.js';

export const categoriaRouter = Router();

categoriaRouter.get('/', findAll);
categoriaRouter.get('/:id', findOne);
categoriaRouter.post('/', sanitizeCategoriaInput, add);
categoriaRouter.put('/:id', sanitizeCategoriaInput, update);
categoriaRouter.patch('/:id', sanitizeCategoriaInput, update);
categoriaRouter.delete('/:id', remove);
