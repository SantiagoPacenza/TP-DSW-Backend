import { Router } from 'express';
import {
  sanitizeUsuarioInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './usuario.controller.js';
import { verificarToken, isAdminEntrenador, isAdminCliente } from '../auth/auth.middleware.js';

export const usuarioRouter = Router();

usuarioRouter.get('/'      , verificarToken, isAdminEntrenador, findAll);
usuarioRouter.get('/:id'   , verificarToken, findOne);                                // los 3 roles pueden acceder
usuarioRouter.post('/'     , verificarToken, isAdminCliente, sanitizeUsuarioInput, add);
usuarioRouter.put('/:id'   , verificarToken, sanitizeUsuarioInput, update);           // los 3 roles pueden acceder
usuarioRouter.patch('/:id' , verificarToken, sanitizeUsuarioInput, update);           // los 3 roles pueden acceder
usuarioRouter.delete('/:id', verificarToken, remove);                                 // los 3 roles pueden acceder

// 1. Donde se verifican los 3 roles es lo mismo que sacar la verificación de roles y solo verificar si tiene token.
// 2. Considerar casos en donde un usuario se afecta a sí mismo: no bloquearle el permiso dejandolo afuera! agregar 
//    su verificación tambien.
