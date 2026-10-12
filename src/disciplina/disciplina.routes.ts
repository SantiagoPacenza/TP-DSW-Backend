import { Router } from 'express';
import {
  sanitizeDisciplinaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './disciplina.controller.js';

const router = Router();

router.get('/', findAll);
router.get('/:id', findOne);

router.post('/', sanitizeDisciplinaInput, add);
router.put('/:id', sanitizeDisciplinaInput, update);
router.patch('/:id', sanitizeDisciplinaInput, update);

router.delete('/:id', remove);

export default router;

//Si alguien toca esta puerta (get, post...) con esta direccion
//mandalo a ejecutar tal funcion (findAll, findOne, ...) al controlador

/*
Rutas de Disciplina:
Define los endpoints y conecta cada método HTTP con su función del controller.
En POST y PUT, sanitizeDisciplinaInput valida los datos antes de ejecutar add o update.
*/