import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './disciplina.controller.js';

export const disciplinaRouter = Router();

disciplinaRouter.get('/', findAll);
disciplinaRouter.get('/:id', findOne);
disciplinaRouter.post('/', add);
disciplinaRouter.put('/:id', update);
disciplinaRouter.delete('/:id', remove);

//Si alguien toca esta puerta (get, post...) con esta direccion
//mandalo a ejecutar tal funcion (findAll, findOne, ...) al controlador