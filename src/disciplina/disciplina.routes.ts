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

//Si alguien toca esta puerta (get, post...) con esta direccion
//mandalo a ejecutar tal funcion (findAll, findOne, ...) al controlador

/*
Rutas de Disciplina:
Define los endpoints y conecta cada método HTTP con su función del controller.
En POST y PUT, sanitizeDisciplinaInput valida los datos antes de ejecutar add o update.
*/
