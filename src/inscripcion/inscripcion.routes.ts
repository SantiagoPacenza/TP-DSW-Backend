import { Router } from 'express';
import {
  sanitizeInscripcionInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './inscripcion.controller.js';

export const inscripcionRouter = Router();

inscripcionRouter.get('/', findAll);
inscripcionRouter.get('/:usuarioId/:claseId/:fechaInscripcion', findOne);
inscripcionRouter.post('/', sanitizeInscripcionInput, add);
inscripcionRouter.put('/:usuarioId/:claseId/:fechaInscripcion', sanitizeInscripcionInput, update);
inscripcionRouter.patch('/:usuarioId/:claseId/:fechaInscripcion', sanitizeInscripcionInput, update);
inscripcionRouter.delete('/:usuarioId/:claseId/:fechaInscripcion', remove);